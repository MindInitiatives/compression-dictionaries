// Switch the demo server to another release: npm run release -- v2
import { writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const name = process.argv[2];
if (!name || !existsSync(join(here, "releases", name))) {
  console.error("Usage: npm run release -- <v1|v2|v3>");
  process.exit(1);
}
writeFileSync(join(here, "releases", "current.txt"), name);
console.log(`Now serving release ${name}. Reload the page in your browser.`);
