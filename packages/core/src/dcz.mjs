// Core helpers for Compression Dictionary Transport using the `dcz` encoding
// (Zstandard with a custom dictionary).
//
// A `dcz` response body is a normal Zstandard stream with a 40-byte header in
// front of it: an 8-byte fixed marker (a Zstandard skippable frame), followed by
// the 32-byte SHA-256 hash of the dictionary it was compressed against.

import { createHash } from "node:crypto";
import zlib from "node:zlib";

export const DCZ_HEADER = Buffer.from([0x5e, 0x2a, 0x4d, 0x18, 0x20, 0x00, 0x00, 0x00]);
export const DCZ_HEADER_LENGTH = DCZ_HEADER.length + 32;

if (typeof zlib.zstdCompressSync !== "function") {
  throw new Error(
    "This Node.js version has no built-in Zstandard support. Use Node 22.15 or later."
  );
}

/** SHA-256 of a buffer, as raw bytes. */
export function sha256(buffer) {
  return createHash("sha256").update(buffer).digest();
}

/**
 * Compress `content` against `dictionary` and return a complete dcz body.
 * Level 19 suits build-time work; use something lower (around 3 to 10) when
 * compressing on the fly per request.
 */
export function encodeDcz(content, dictionary, { level = 19 } = {}) {
  const compressed = zlib.zstdCompressSync(content, {
    dictionary,
    params: { [zlib.constants.ZSTD_c_compressionLevel]: level },
  });
  return Buffer.concat([DCZ_HEADER, sha256(dictionary), compressed]);
}

/**
 * Decode a dcz body. Used to verify build output, since browsers are the only
 * other consumer and they give you no error message when decoding fails.
 */
export function decodeDcz(body, dictionary) {
  if (!body.subarray(0, DCZ_HEADER.length).equals(DCZ_HEADER)) {
    throw new Error("Not a dcz body: header marker missing");
  }
  const embeddedHash = body.subarray(DCZ_HEADER.length, DCZ_HEADER_LENGTH);
  if (!embeddedHash.equals(sha256(dictionary))) {
    throw new Error("dcz body was compressed against a different dictionary");
  }
  return zlib.zstdDecompressSync(body.subarray(DCZ_HEADER_LENGTH), { dictionary });
}

/**
 * Parse the `Available-Dictionary` request header. Its value is an HTTP
 * structured-field byte sequence: base64 wrapped in colons.
 * Returns the hash as lowercase hex, or null if absent or malformed.
 */
export function parseAvailableDictionary(headerValue) {
  if (!headerValue) return null;
  const match = /^:([A-Za-z0-9+/]+={0,2}):$/.exec(headerValue.trim());
  if (!match) return null;
  const bytes = Buffer.from(match[1], "base64");
  return bytes.length === 32 ? bytes.toString("hex") : null;
}

/** True if the client listed `encoding` in Accept-Encoding without q=0. */
export function acceptsEncoding(acceptEncodingHeader = "", encoding) {
  return acceptEncodingHeader.split(",").some((part) => {
    const [token, ...params] = part.trim().split(";");
    if (token.trim().toLowerCase() !== encoding) return false;
    const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
    return !q || Number(q.slice(2)) > 0;
  });
}

/** Build a `Use-As-Dictionary` header value for a URL pattern. */
export function useAsDictionaryHeader(matchPattern) {
  return `match="${matchPattern}"`;
}
