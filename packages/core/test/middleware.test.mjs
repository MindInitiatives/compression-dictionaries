// Regression tests for fixes made to compressedStatic.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { compressedStatic } from "../src/middleware.mjs";

// Minimal request/response mocks for testing the middleware in isolation.
const makeReq = (path, acceptEncoding = undefined) => ({
  path,
  get: (header) => (header.toLowerCase() === "accept-encoding" ? acceptEncoding : undefined),
});

const makeRes = (onSend) => {
  const res = {
    statusCode: 200,
    headers: {},
    locals: {},
    set: (k, v) => { if (typeof k === "object") Object.assign(res.headers, k); else res.headers[k] = v; return res; },
    get: (k) => res.headers[k.toLowerCase()] ?? null,
    vary: () => res,
    send: onSend ?? (() => {}),
    status: (n) => { res.statusCode = n; return res; },
    end: () => {},
  };
  return res;
};

test("compressedStatic skips a path that resolves to a directory", () => {
  // Regression for a bug where Next.js static export created both a products/
  // directory and a products.html file. existsSync returned true for the
  // directory, then readFileSync threw EISDIR. The fix uses statSync().isFile().
  const dir = mkdtempSync(join(tmpdir(), "cdt-mw-test-"));
  try {
    mkdirSync(join(dir, "products"));
    const handler = compressedStatic({ root: dir });
    let nextCalled = false;
    handler(makeReq("/products"), makeRes(), () => { nextCalled = true; });
    assert.ok(nextCalled, "next() should be called when the path is a directory");
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test("compressedStatic serves a file that sits next to a same-named directory", () => {
  const dir = mkdtempSync(join(tmpdir(), "cdt-mw-test-"));
  try {
    mkdirSync(join(dir, "products"));
    writeFileSync(join(dir, "products.html"), "<html>products</html>");
    const handler = compressedStatic({ root: dir });
    let sent = null;
    handler(makeReq("/products.html"), makeRes((body) => { sent = body; }), () => {
      assert.fail("next() should not be called when the file exists");
    });
    assert.ok(sent !== null, "response body should have been sent");
  } finally {
    rmSync(dir, { recursive: true });
  }
});
