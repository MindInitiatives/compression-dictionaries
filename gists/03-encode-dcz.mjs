// A dcz body: 8-byte marker + SHA-256 of the dictionary + a Zstandard stream
// compressed against that dictionary. Node 22.15+ has Zstandard built in.
import { createHash } from "node:crypto";
import zlib from "node:zlib";

const DCZ_HEADER = Buffer.from([0x5e, 0x2a, 0x4d, 0x18, 0x20, 0x00, 0x00, 0x00]);

export function encodeDcz(content, dictionary, level = 19) {
  const hash = createHash("sha256").update(dictionary).digest();
  const compressed = zlib.zstdCompressSync(content, {
    dictionary,
    params: { [zlib.constants.ZSTD_c_compressionLevel]: level },
  });
  return Buffer.concat([DCZ_HEADER, hash, compressed]);
}
