// Demo server. Serves whichever release is named in releases/current.txt, so
// you can switch releases with `npm run release -- v2` without restarting.

import express from "express";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { dictionaryDeltas, sharedDictionary, compressedStatic } from "@compression-dictionaries/core/middleware";

const here = dirname(fileURLToPath(import.meta.url));
const releasesDir = join(here, "releases");

if (!existsSync(join(releasesDir, "current.txt"))) {
  console.error("No releases found. Run `npm run generate` first.");
  process.exit(1);
}

const current = () => readFileSync(join(releasesDir, "current.txt"), "utf8").trim();
const releasePath = (...parts) => join(releasesDir, current(), ...parts);

let manifestCache = { release: null, value: null };
const manifest = () => {
  if (manifestCache.release !== current()) {
    manifestCache = { release: current(), value: JSON.parse(readFileSync(releasePath("deltas", "manifest.json"), "utf8")) };
  }
  return manifestCache.value;
};

const log = (line) => console.log(`[${current()}] ${line}`);
const app = express();
app.disable("x-powered-by");

app.use(dictionaryDeltas({ manifest, deltasDir: () => releasePath("deltas"), log }));

app.use(sharedDictionary({
  dictionaryUrl: "/dictionaries/products.dat",
  dictionaryPath: () => releasePath("public", "dictionaries", "products.dat"),
  match: "/products/*",
  log,
}));

app.use(compressedStatic({
  root: () => releasePath("public"),
  cacheControl: (path) => (path.startsWith("/assets/") ? "public, max-age=31536000, immutable" : "no-cache"),
  log,
}));

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
  console.log(`Demo running at http://localhost:${port} (release ${current()})`);
  console.log("Open it in a Chromium-based browser with DevTools open on the Network tab.");
});
