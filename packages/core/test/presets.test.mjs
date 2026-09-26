import { test } from "node:test";
import assert from "node:assert/strict";
import { presets, parseAssetPath } from "../src/presets.mjs";

// These cases describe the naming schemes as documented. The example projects
// are the real check: run `build-deltas --dry-run` against their build output.

test("vite: entry and named route chunks pair by name", () => {
  const parsed = parseAssetPath("index-BxQ3k9aZ.js", presets.vite);
  assert.equal(parsed.key, "index.js");
  assert.equal(parsed.hash, "BxQ3k9aZ");
});

test("vite: a hash containing a hyphen still splits correctly", () => {
  assert.equal(parseAssetPath("Transfers-a1-b2c3d.js", presets.vite).key, "Transfers.js");
});

test("angular: anonymous chunks are flagged as unstable", () => {
  assert.equal(parseAssetPath("main-7XK2P4QM.js", presets.angular).unstable, false);
  assert.equal(parseAssetPath("chunk-7XK2P4QM.js", presets.angular).unstable, true);
});

test("next-webpack: nested paths keep their directory in the key", () => {
  const parsed = parseAssetPath("chunks/app/page-0123456789abcdef.js", presets["next-webpack"]);
  assert.equal(parsed.key, "chunks/app/page.js");
});

test("numeric chunk names are flagged as unstable", () => {
  assert.equal(parseAssetPath("chunks/123-0123456789abcdef.js", presets["next-webpack"]).unstable, true);
});

test("files that do not match the preset are ignored", () => {
  assert.equal(parseAssetPath("favicon.ico", presets.vite), null);
});

test("paths with bracket characters are marked unsafe for URLPattern", () => {
  // Next.js dynamic routes like app/products/[id]/page-xxxx.js contain brackets.
  // URLPattern treats [id] as a character class, so build-deltas must skip these
  // paths rather than produce an invalid match pattern.
  const parsed = parseAssetPath("chunks/app/products/[id]/page-0123456789abcdef.js", presets["next-webpack"]);
  assert.notEqual(parsed, null);
  assert.equal(parsed.patternSafe, false, "square brackets make the path unsafe for URLPattern");
});

test("Turbopack content-addressed names are not recognised by next-webpack preset", () => {
  // Turbopack produces content-addressed IDs with no stable name prefix,
  // such as 0bma92pht_c97.js and 0cz1d0mv5g_q7.js. The next-webpack preset
  // requires a stable name followed by a 16-hex hash; without a stable prefix
  // these files return null and are skipped by build-deltas.
  assert.equal(parseAssetPath("chunks/0bma92pht_c97.js", presets["next-webpack"]), null);
  assert.equal(parseAssetPath("chunks/0cz1d0mv5g_q7.js", presets["next-webpack"]), null);
});
