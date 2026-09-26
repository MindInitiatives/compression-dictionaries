// Express middleware for Compression Dictionary Transport.
//
// dictionaryDeltas     serves prebuilt dcz deltas for versioned assets.
// sharedDictionary     serves a dictionary file and compresses matching HTML
//                      against it on the fly.
// compressedStatic     a small static handler with Brotli and gzip fallback,
//                      so every request has a sensible response either way.
//
// Options that describe the current release (root, manifest, deltasDir) accept
// either a value or a function, so a server can switch releases without a restart.

import { readFileSync, existsSync } from "node:fs";
import { join, normalize, extname } from "node:path";
import zlib from "node:zlib";
import {
  encodeDcz,
  sha256,
  parseAvailableDictionary,
  acceptsEncoding,
  useAsDictionaryHeader,
} from "./dcz.mjs";

const resolve = (value) => (typeof value === "function" ? value() : value);

const CONTENT_TYPES = {
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".json": "application/json",
  ".dat": "application/octet-stream",
};

export function dictionaryDeltas({ manifest, deltasDir, log = () => {} }) {
  return (req, res, next) => {
    const entry = resolve(manifest)?.assets?.[req.path];
    if (!entry) return next();

    // Both headers change which bytes the server sends, so both must be in Vary.
    // Without this, a CDN can hand a dcz body to a browser that cannot decode it.
    res.vary("Accept-Encoding");
    res.vary("Available-Dictionary");

    // Announce this response as the dictionary for the next release.
    if (entry.match) res.set("Use-As-Dictionary", useAsDictionaryHeader(entry.match));

    const available = parseAvailableDictionary(req.get("Available-Dictionary"));
    const delta = available && entry.deltas[available];

    if (!delta || !acceptsEncoding(req.get("Accept-Encoding"), "dcz")) return next();

    const body = readFileSync(join(resolve(deltasDir), delta.file));
    res.set({
      "Content-Encoding": "dcz",
      "Content-Type": CONTENT_TYPES[extname(req.path)] ?? "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
    });
    log(`dcz    ${req.path}  ${body.length} bytes (against ${delta.dictionary})`);
    res.send(body);
  };
}

export function sharedDictionary({ dictionaryUrl, dictionaryPath, match, maxAge = 86400, level = 10, log = () => {} }) {
  let cached;
  const load = () => {
    const path = resolve(dictionaryPath);
    if (cached?.path !== path) {
      const bytes = readFileSync(path);
      cached = { path, bytes, hashHex: sha256(bytes).toString("hex") };
    }
    return cached;
  };
  const matcher = new RegExp(`^${match.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*")}$`);

  return (req, res, next) => {
    const dictionary = load();

    // 1. The dictionary itself. The browser fetches it at idle time because of
    //    <link rel="compression-dictionary">, and keeps it while it is fresh.
    if (req.path === dictionaryUrl) {
      res.set({
        "Use-As-Dictionary": useAsDictionaryHeader(match),
        "Cache-Control": `public, max-age=${maxAge}`,
        "Content-Type": CONTENT_TYPES[".dat"],
      });
      return res.send(dictionary.bytes);
    }

    // 2. Pages covered by the dictionary: compress on the fly when the browser has it.
    if (!matcher.test(req.path)) return next();

    res.vary("Accept-Encoding");
    res.vary("Available-Dictionary");

    const available = parseAvailableDictionary(req.get("Available-Dictionary"));
    if (available !== dictionary.hashHex || !acceptsEncoding(req.get("Accept-Encoding"), "dcz")) {
      return next();
    }

    const originalSend = res.send.bind(res);
    res.send = (body) => {
      const html = Buffer.isBuffer(body) ? body : Buffer.from(String(body));
      const compressed = encodeDcz(html, dictionary.bytes, { level });
      res.set("Content-Encoding", "dcz");
      log(`dcz    ${req.path}  ${compressed.length} bytes (shared dictionary, ${html.length} raw)`);
      return originalSend(compressed);
    };
    res.locals.skipCompression = true;
    next();
  };
}

export function compressedStatic({ root, cacheControl = () => "no-cache", log = () => {} }) {
  const memo = new Map();

  return (req, res, next) => {
    const base = resolve(root);
    const relative = normalize(req.path === "/" ? "/index.html" : req.path);
    if (relative.includes("..")) return res.status(400).end();

    const path = join(base, relative);
    if (!existsSync(path)) return next();

    const raw = readFileSync(path);
    res.set("Content-Type", CONTENT_TYPES[extname(path)] ?? "application/octet-stream");
    if (!res.get("Cache-Control")) res.set("Cache-Control", cacheControl(relative));
    res.vary("Accept-Encoding");

    // A middleware earlier in the chain is handling encoding (shared dictionary).
    if (res.locals.skipCompression) return res.send(raw);

    const accept = req.get("Accept-Encoding");
    const encoding = acceptsEncoding(accept, "br") ? "br" : acceptsEncoding(accept, "gzip") ? "gzip" : null;
    if (!encoding) return res.send(raw);

    const key = `${path}:${encoding}`;
    if (!memo.has(key)) {
      memo.set(key, encoding === "br" ? zlib.brotliCompressSync(raw) : zlib.gzipSync(raw));
    }
    const body = memo.get(key);
    res.set("Content-Encoding", encoding);
    log(`${encoding.padEnd(6)} ${req.path}  ${body.length} bytes`);
    res.send(body);
  };
}
