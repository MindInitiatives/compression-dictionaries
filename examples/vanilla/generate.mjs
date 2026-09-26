// Generates three releases of a small plain HTML and JavaScript app, then runs
// the build-deltas step for each release against the ones before it.
//
// The JavaScript bundle is synthetic: a few hundred generated functions that
// look like a banking front end. Each release changes a small number of them,
// the way a typical deploy does. Treat the resulting sizes as an illustration
// of the mechanism, not as a benchmark of a real application.

import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { products as sharedProducts } from "@compression-dictionaries/demo-content";

const here = dirname(fileURLToPath(import.meta.url));
const releasesDir = join(here, "releases");
const buildDeltas = fileURLToPath(import.meta.resolve("@compression-dictionaries/core/build-deltas"));
const quiet = process.argv.includes("--quiet");

const RELEASES = [
  { name: "v1", changed: [], added: 0, styleAccent: "#1f4e79" },
  { name: "v2", changed: [12, 87, 140, 233, 301], added: 2, styleAccent: "#1f4e79" },
  { name: "v3", changed: [5, 44, 90, 91, 150, 188, 260, 299, 340, 377], added: 3, styleAccent: "#2d6a4f" },
];

const VERBS = ["format", "validate", "parse", "render", "fetch", "compute", "normalise", "reconcile", "map", "select"];
const NOUNS = ["Amount", "Account", "Transfer", "Beneficiary", "Statement", "Card", "Loan", "Savings", "Fee", "Settlement", "Mandate", "Receipt"];
const CURRENCIES = ["NGN", "GBP", "KES", "GHS", "ZAR", "USD"];


// ---------------------------------------------------------------------------

function writeHashed(dir, name, ext, content) {
  const hash = createHash("sha256").update(content).digest("hex").slice(0, 8);
  const file = `${name}-${hash}.${ext}`;
  writeFileSync(join(dir, file), content);
  return `/assets/${file}`;
}

// Deterministic pseudo-random numbers so every run produces the same output.
function rng(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}


const WORDS = ["balance", "ledger", "payee", "limit", "channel", "tenor", "rate", "narration", "reference", "session",
  "branch", "wallet", "merchant", "terminal", "batch", "retry", "status", "queue", "token", "device", "otp", "pin",
  "mandate", "cycle", "posting", "reversal", "charge", "tier", "region", "profile"];

function moduleSource(i, revision) {
  // The function name depends only on its position; the body depends on the revision.
  const naming = rng(i * 7919);
  const name = `${VERBS[Math.floor(naming() * VERBS.length)]}${NOUNS[Math.floor(naming() * NOUNS.length)]}_${i}`;
  const random = rng(i * 7919 + revision * 104729);
  const pick = (list) => list[Math.floor(random() * list.length)];
  const id = () => `${pick(WORDS)}${pick(NOUNS)}${Math.floor(random() * 97)}`;
  const phrase = () => Array.from({ length: 3 + Math.floor(random() * 5) }, () => pick(WORDS)).join(" ");
  const num = () => Math.floor(random() * 100000);

  const statements = [];
  const count = 5 + Math.floor(random() * 9);
  for (let s = 0; s < count; s++) {
    const a = id(), b = id();
    switch (Math.floor(random() * 8)) {
      case 0: statements.push(`var ${a} = input.${pick(WORDS)} != null ? input.${pick(WORDS)} : ${num()};`); break;
      case 1: statements.push(`if (${a}_check(input) > ${num()}) { throw new Error("${phrase()} (${pick(CURRENCIES)})"); }`); break;
      case 2: statements.push(`var ${b} = context.${pick(WORDS)}.filter(function (x) { return x.${pick(WORDS)} === "${pick(WORDS)}"; }).length;`); break;
      case 3: statements.push(`context.emit("${name}:${pick(WORDS)}", { ${pick(WORDS)}: ${num()}, ${pick(WORDS)}: "${phrase()}" });`); break;
      case 4: statements.push(`for (var k${s} = 0; k${s} < ${1 + (num() % 12)}; k${s}++) { total${s} += rates[${num() % 64}] * ${random().toFixed(4)}; }`); break;
      case 5: statements.push(`var ${a} = ${pick(["Math.round", "Math.floor", "Math.ceil"])}(${b} * ${random().toFixed(3)} + ${num()}) / 100;`); break;
      case 6: statements.push(`result.messages.push("${phrase()}");`); break;
      default: statements.push(`return { ok: ${random() > 0.5}, code: "${pick(WORDS).toUpperCase()}_${num()}", field: "${name}" };`);
    }
  }
  return `  "${name}": function (input, context) {\n    ${statements.join("\n    ")}\n  },`;
}

function appBundle(releaseName, history) {
  const revisions = new Map();
  history.forEach((r, n) => r.changed.forEach((i) => revisions.set(i, n)));
  const total = 400 + history.reduce((sum, r) => sum + r.added, 0);

  const modules = [];
  for (let i = 0; i < total; i++) modules.push(moduleSource(i, revisions.get(i) ?? 0));

  return `/* Demo banking app bundle. Release ${releaseName}. Generated file. */
(function () {
  "use strict";
  var modules = {
${modules.join("\n")}
  };
  window.__demo = { release: "${releaseName}", moduleCount: Object.keys(modules).length, modules: modules };
  document.dispatchEvent(new CustomEvent("demo:ready"));
})();
`;
}

function vendorBundle() {
  const random = rng(42);
  const lines = [];
  for (let i = 0; i < 250; i++) {
    lines.push(`  function util_${i}(a, b) { return a ${random() > 0.5 ? "+" : "*"} b + ${Math.floor(random() * 1000)}; }`);
  }
  return `/* Demo vendor bundle. Unchanged between releases, so it stays cached. */\n(function () {\n${lines.join("\n")}\n})();\n`;
}

function stylesheet(accent) {
  return `:root { --ink: #1b1f24; --muted: #5b6470; --line: #d8dde3; --accent: ${accent}; --paper: #ffffff; }
* { box-sizing: border-box; }
body { margin: 0; font: 16px/1.55 "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif; color: var(--ink); background: var(--paper); }
main { max-width: 44rem; margin: 0 auto; padding: 3rem 1.25rem 4rem; }
h1 { font-size: 2rem; line-height: 1.2; margin: 0 0 0.5rem; font-weight: 600; }
p { margin: 0 0 1rem; color: var(--muted); }
table { width: 100%; border-collapse: collapse; margin: 1.5rem 0; font-variant-numeric: tabular-nums; }
th, td { text-align: left; padding: 0.5rem 0.25rem; border-bottom: 1px solid var(--line); }
th { font-weight: 600; color: var(--muted); font-size: 0.9rem; }
td.encoding { color: var(--accent); font-weight: 600; }
a { color: var(--accent); }
a:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.products { columns: 2; padding-left: 1.1rem; }
`;
}

function indexPage(releaseName, assets) {
  return `<!doctype html>
<html lang="en-GB">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Compression dictionaries demo, release ${releaseName}</title>
  <link rel="stylesheet" href="${assets.styles}">
  <link rel="compression-dictionary" href="/dictionaries/products.dat">
  <script src="${assets.vendor}" defer></script>
  <script src="${assets.app}" defer></script>
</head>
<body>
<main>
  <h1>Release ${releaseName}</h1>
  <p>Load this page once, switch to the next release with <code>npm run release -- v2</code>, then reload. The app bundle should arrive as <code>dcz</code>, compressed against the version your browser already holds.</p>
  <table>
    <thead><tr><th>Asset</th><th>Transferred</th><th>Decoded</th><th>Encoding</th></tr></thead>
    <tbody id="assets"><tr><td colspan="4">Waiting for resources to load</td></tr></tbody>
  </table>
  <p>Transfer sizes include headers, so small or cached files show the overhead. The server log names the encoding for every response.</p>
  <h2>Product pages</h2>
  <p>These pages share one layout. After the browser has fetched the shared dictionary in the background, each page is compressed against it.</p>
  <ul class="products">
${products().map((p) => `    <li><a href="/products/${p.id}.html">${p.name}</a></li>`).join("\n")}
  </ul>
</main>
<script>
  document.addEventListener("demo:ready", function () {
    var rows = performance.getEntriesByType("resource")
      .filter(function (e) { return e.name.indexOf("/assets/") !== -1; })
      .map(function (e) {
        var name = e.name.split("/").pop();
        var encoding = e.contentEncoding || "see server log";
        return "<tr><td>" + name + "</td><td>" + (e.transferSize / 1024).toFixed(1) + " KB</td><td>" +
          (e.decodedBodySize / 1024).toFixed(1) + " KB</td><td class=\\"encoding\\">" + encoding + "</td></tr>";
      });
    document.getElementById("assets").innerHTML = rows.join("");
  });
</script>
</body>
</html>
`;
}

function products() {
  return sharedProducts;
}

// The markup every product page shares. Used both to render pages and as the
// raw content of the shared dictionary.
function productLayout(styles = "/assets/styles.css", fill = { name: "", rate: "", fee: "", id: "" }) {
  return `<!doctype html>
<html lang="en-GB">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${fill.name} | Demo Bank</title>
  <link rel="stylesheet" href="${styles}">
</head>
<body>
<main>
  <nav><a href="/">Back to all accounts</a></nav>
  <h1>${fill.name}</h1>
  <p>Compare the rate, fees and eligibility for this product before you apply. Rates are variable unless stated otherwise and may change at any time.</p>
  <table>
    <tbody>
      <tr><th scope="row">Interest rate (AER)</th><td>${fill.rate}%</td></tr>
      <tr><th scope="row">Monthly fee</th><td>${fill.fee}</td></tr>
      <tr><th scope="row">Minimum opening balance</th><td>£0</td></tr>
      <tr><th scope="row">Access to funds</th><td>Instant, through the app and online banking</td></tr>
    </tbody>
  </table>
  <h2>Eligibility</h2>
  <p>You must be 18 or over and a UK resident. We will run a soft credit check that does not affect your credit score.</p>
  <h2>Important information</h2>
  <p>Eligible deposits are protected up to the applicable limit. Read the key facts document and terms and conditions before you apply. Product reference ${fill.id}.</p>
</main>
</body>
</html>
`;
}

function productPage(product, styles) {
  return productLayout(styles, product);
}

function productDictionary() {
  // Raw content dictionary: the shared layout with empty slots. For a real
  // site, build this from a sample of real pages, or train one with
  // "zstd --train" on a larger corpus.
  return productLayout("/assets/styles.css");
}

function main() {
  rmSync(releasesDir, { recursive: true, force: true });

  RELEASES.forEach((release, index) => {
    const publicDir = join(releasesDir, release.name, "public");
    const assetsDir = join(publicDir, "assets");
    mkdirSync(assetsDir, { recursive: true });

    // Changes accumulate: v3 includes v2's edits as well as its own.
    const history = RELEASES.slice(0, index + 1);
    const app = writeHashed(assetsDir, "app", "js", appBundle(release.name, history));
    const vendor = writeHashed(assetsDir, "vendor", "js", vendorBundle()); // identical every release
    const styles = writeHashed(assetsDir, "styles", "css", stylesheet(release.styleAccent));

    writeFileSync(join(publicDir, "index.html"), indexPage(release.name, { app, vendor, styles }));

    mkdirSync(join(publicDir, "products"), { recursive: true });
    for (const product of products()) {
      writeFileSync(join(publicDir, "products", `${product.id}.html`), productPage(product, styles));
    }

    mkdirSync(join(publicDir, "dictionaries"), { recursive: true });
    writeFileSync(join(publicDir, "dictionaries", "products.dat"), productDictionary());

    const previous = RELEASES.slice(0, index).reverse().slice(0, 2)
      .flatMap((r) => ["--previous", join(releasesDir, r.name, "public", "assets")]);

    if (!quiet) console.log(`\n${release.name}`);
    execFileSync(process.execPath, [
      buildDeltas,
      "--preset", "vanilla",
      "--current", assetsDir,
      ...previous,
      "--public-path", "/assets",
      "--out", join(releasesDir, release.name, "deltas"),
    ], { stdio: quiet ? "ignore" : "inherit" });
  });

  writeFileSync(join(releasesDir, "current.txt"), "v1");
  if (!quiet) console.log("\nReleases written to examples/vanilla/releases. Current release: v1");
}

main();
