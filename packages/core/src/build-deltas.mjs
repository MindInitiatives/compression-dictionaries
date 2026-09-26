#!/usr/bin/env node
// Build step: compress each asset in the current release against the matching
// asset from one or more previous releases, and write a manifest the server
// uses to pick the right delta at request time.
//
// Usage:
//   node src/build-deltas.mjs --preset vite \
//     --current dist/assets --previous releases/prev/assets \
//     --public-path /assets --out dist/deltas
//
// --previous can be repeated (newest first). --dry-run prints the pairings
// without writing anything, which is the quickest way to check a preset.

import { readdirSync, readFileSync, writeFileSync, mkdirSync, statSync, existsSync } from "node:fs";
import { join, dirname, posix } from "node:path";
import { parseArgs } from "node:util";
import zlib from "node:zlib";
import { encodeDcz, decodeDcz, sha256 } from "./dcz.mjs";
import { presets, parseAssetPath } from "./presets.mjs";

const { values: args } = parseArgs({
  options: {
    preset: { type: "string", default: "vite" },
    current: { type: "string" },
    previous: { type: "string", multiple: true, default: [] },
    "public-path": { type: "string", default: "/" },
    out: { type: "string" },
    level: { type: "string", default: "19" },
    "dry-run": { type: "boolean", default: false },
  },
});

const pattern = presets[args.preset];
if (!pattern) fail(`Unknown preset "${args.preset}". Options: ${Object.keys(presets).join(", ")}`);
if (!args.current) fail("--current is required");
if (!args.out && !args["dry-run"]) fail("--out is required unless --dry-run is set");

const publicPath = args["public-path"].endsWith("/") ? args["public-path"] : `${args["public-path"]}/`;
const level = Number(args.level);

// Index the previous releases by stable key, newest release first.
const previousByKey = new Map();
for (const dir of args.previous.filter((d) => existsSync(d))) {
  for (const rel of walk(dir)) {
    const parsed = parseAssetPath(rel, pattern);
    if (!parsed) continue;
    const list = previousByKey.get(parsed.key) ?? [];
    list.push({ ...parsed, path: join(dir, rel), rel });
    previousByKey.set(parsed.key, list);
  }
}

const manifest = { preset: args.preset, generatedAt: new Date().toISOString(), assets: {} };
const report = [];

for (const rel of walk(args.current)) {
  const parsed = parseAssetPath(rel, pattern);
  if (!parsed) continue;

  const url = posix.join(publicPath, rel);
  const entry = { deltas: {} };

  // Every recognised asset announces itself as a dictionary for the next
  // release, as long as its name is stable and safe to put in a pattern.
  if (parsed.unstable) {
    report.push(`skip   ${rel}  (name "${parsed.name}" is not stable across builds)`);
  } else if (!parsed.patternSafe) {
    report.push(`skip   ${rel}  (name contains URLPattern special characters)`);
  } else {
    entry.match = posix.join(publicPath, `${parsed.dir}${parsed.name}-*.${parsed.ext}`);
  }

  const content = readFileSync(join(args.current, rel));
  const earlier = previousByKey.get(parsed.key) ?? [];
  const seen = new Set([parsed.hash]);
  const candidates = earlier.filter((p) => !seen.has(p.hash) && seen.add(p.hash));

  if (earlier.some((p) => p.hash === parsed.hash) && candidates.length === 0) {
    report.push(`same   ${rel}  (unchanged, browsers keep their cached copy)`);
  } else if (candidates.length === 0) {
    report.push(`new    ${rel}  (no earlier version to diff against)`);
  }

  for (const previous of candidates) {
    if (args["dry-run"]) {
      report.push(`pair   ${previous.rel}  ->  ${rel}`);
      continue;
    }

    const dictionary = readFileSync(previous.path);
    const body = encodeDcz(content, dictionary, { level });

    // Round-trip check: a bad delta fails silently in the browser, so fail loudly here.
    if (!decodeDcz(body, dictionary).equals(content)) fail(`Round-trip check failed for ${rel}`);

    const hashHex = sha256(dictionary).toString("hex");
    const deltaRel = posix.join(hashHex, `${rel}.dcz`);
    const deltaPath = join(args.out, deltaRel);
    mkdirSync(dirname(deltaPath), { recursive: true });
    writeFileSync(deltaPath, body);

    entry.deltas[hashHex] = { file: deltaRel, dictionary: posix.join(publicPath, previous.rel), bytes: body.length };
    report.push(`delta  ${previous.rel}  ->  ${rel}  ${kb(body.length)}`);
  }

  if (!args["dry-run"]) {
    entry.stats = {
      raw: content.length,
      brotli: zlib.brotliCompressSync(content, {
        params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 },
      }).length,
    };
  }
  manifest.assets[url] = entry;
}

if (!args["dry-run"]) {
  mkdirSync(args.out, { recursive: true });
  writeFileSync(join(args.out, "manifest.json"), JSON.stringify(manifest, null, 2));
}

console.log(report.join("\n") || "No assets matched the preset. Check --preset and --current.");

function* walk(root, prefix = "") {
  for (const name of readdirSync(join(root, prefix))) {
    const rel = prefix ? `${prefix}/${name}` : name;
    if (statSync(join(root, rel)).isDirectory()) yield* walk(root, rel);
    else yield rel;
  }
}

function kb(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function fail(message) {
  console.error(`build-deltas: ${message}`);
  process.exit(1);
}
