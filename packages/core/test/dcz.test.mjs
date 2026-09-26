import { test } from "node:test";
import assert from "node:assert/strict";
import { encodeDcz, decodeDcz, sha256, parseAvailableDictionary, acceptsEncoding, DCZ_HEADER_LENGTH } from "../src/dcz.mjs";

const dictionary = Buffer.from("export function transfer(amount) { return amount * 100; }\n".repeat(50));
const content = Buffer.from(dictionary.toString().replace("* 100", "* 1000") + "export const fee = 2;\n");

test("dcz round trip reproduces the original bytes", () => {
  const body = encodeDcz(content, dictionary);
  assert.ok(decodeDcz(body, dictionary).equals(content));
});

test("dcz body starts with the marker and the dictionary hash", () => {
  const body = encodeDcz(content, dictionary);
  assert.equal(body.subarray(0, 4).toString("hex"), "5e2a4d18");
  assert.ok(body.subarray(8, DCZ_HEADER_LENGTH).equals(sha256(dictionary)));
});

test("decoding against the wrong dictionary fails loudly", () => {
  const body = encodeDcz(content, dictionary);
  assert.throws(() => decodeDcz(body, Buffer.from("not the dictionary")), /different dictionary/);
});

test("Available-Dictionary is parsed from a structured-field byte sequence", () => {
  const hash = sha256(dictionary);
  assert.equal(parseAvailableDictionary(`:${hash.toString("base64")}:`), hash.toString("hex"));
  assert.equal(parseAvailableDictionary("not-a-byte-sequence"), null);
  assert.equal(parseAvailableDictionary(":c2hvcnQ=:"), null, "rejects values that are not 32 bytes");
  assert.equal(parseAvailableDictionary(undefined), null);
});

test("Accept-Encoding parsing respects q=0", () => {
  assert.ok(acceptsEncoding("gzip, br, zstd, dcb, dcz", "dcz"));
  assert.ok(!acceptsEncoding("gzip, br", "dcz"));
  assert.ok(!acceptsEncoding("br, dcz;q=0", "dcz"));
  assert.ok(acceptsEncoding("br;q=0.5, dcz;q=1", "dcz"));
});
