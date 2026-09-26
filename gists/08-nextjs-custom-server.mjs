// Self-hosted Next.js: serve deltas for /_next/static assets, then hand
// everything else to Next.js as normal.
import express from "express";
import next from "next";
import { readFileSync } from "node:fs";
import { dictionaryDeltas } from "./tools/compression-dictionaries/middleware.mjs";

const app = next({ dev: false });
const handle = app.getRequestHandler();
await app.prepare();

const manifest = JSON.parse(readFileSync(".next/deltas/manifest.json", "utf8"));
const server = express();
server.use(dictionaryDeltas({ manifest, deltasDir: ".next/deltas" }));
server.use((req, res) => handle(req, res));
server.listen(3000);
