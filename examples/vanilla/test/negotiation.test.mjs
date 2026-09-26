// End-to-end check of the header negotiation against the demo server.
// Browsers do the same thing automatically; this test does it by hand.
// `npm test` regenerates the releases first.

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { sha256, decodeDcz } from "@compression-dictionaries/core/dcz";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const releases = join(root, "releases");
const PORT = 3999;
const base = `http://localhost:${PORT}`;
let server;

const setRelease = (name) => writeFileSync(join(releases, "current.txt"), name);
const scriptUrl = async () => /src="(\/assets\/app-[0-9a-f]{8}\.js)"/.exec(await (await fetch(base)).text())[1];
const sfBytes = (buffer) => `:${sha256(buffer).toString("base64")}:`;

before(async () => {
  setRelease("v1");
  server = spawn(process.execPath, [join(root, "server.mjs")], { env: { ...process.env, PORT } });
  await new Promise((resolve) => server.stdout.once("data", resolve));
});

after(() => {
  server.kill();
  setRelease("v1");
});

test("first visit: asset is served normally and marked as a dictionary", async () => {
  setRelease("v1");
  const res = await fetch(base + (await scriptUrl()), { headers: { "Accept-Encoding": "br, dcz" } });
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("use-as-dictionary"), 'match="/assets/app-*.js"');
  assert.match(res.headers.get("vary"), /Available-Dictionary/i);
});

test("after a deploy: browser holding v1 receives a dcz delta for v3", async () => {
  setRelease("v1");
  const v1Url = await scriptUrl();
  const v1 = readFileSync(join(releases, "v1", "public", v1Url));

  setRelease("v3");
  const v3Url = await scriptUrl();
  const res = await fetch(base + v3Url, {
    headers: { "Accept-Encoding": "gzip, br, zstd, dcb, dcz", "Available-Dictionary": sfBytes(v1) },
  });

  assert.equal(res.headers.get("content-encoding"), "dcz");
  const body = Buffer.from(await res.arrayBuffer());
  const expected = readFileSync(join(releases, "v3", "public", v3Url));
  assert.ok(decodeDcz(body, v1).equals(expected), "delta decodes to the v3 file");
  assert.ok(body.length < expected.length / 20, "delta is a small fraction of the file");
});

test("unknown dictionary falls back to Brotli", async () => {
  setRelease("v3");
  const res = await fetch(base + (await scriptUrl()), {
    headers: { "Accept-Encoding": "br, dcz", "Available-Dictionary": sfBytes(Buffer.from("something else")) },
  });
  assert.equal(res.headers.get("content-encoding"), "br");
});

test("shared dictionary: product pages compress against the layout dictionary", async () => {
  setRelease("v1");
  const dictRes = await fetch(`${base}/dictionaries/products.dat`);
  assert.equal(dictRes.headers.get("use-as-dictionary"), 'match="/products/*"');
  const dictionary = Buffer.from(await dictRes.arrayBuffer());

  const res = await fetch(`${base}/products/3.html`, {
    headers: { "Accept-Encoding": "br, dcz", "Available-Dictionary": sfBytes(dictionary) },
  });
  assert.equal(res.headers.get("content-encoding"), "dcz");
  const html = decodeDcz(Buffer.from(await res.arrayBuffer()), dictionary).toString();
  assert.match(html, /Business current account/);
});
