# Vanilla: plain HTML and JavaScript

This example applies Compression Dictionary Transport to a plain HTML and JavaScript banking app. It demonstrates two forms of the feature: delta-compressed bundles for returning users after a deploy, and a shared dictionary that compresses product detail pages against a common HTML template.

## What the example shows

When a user visits the app for the first time, the server marks the JavaScript bundle with a `Use-As-Dictionary` response header. The browser stores the file and, on the next visit after a deploy, sends its SHA-256 fingerprint in an `Available-Dictionary` request header. The server recognises the fingerprint, looks up the precomputed delta, and sends back a `dcz` response, which is the new bundle compressed against the old one.

The vanilla example also shows shared-dictionary compression. The server serves a dictionary file at `/dictionaries/products.dat` that represents the common HTML structure of product detail pages. Any browser holding that dictionary gets each product page compressed against it.

## What the vanilla preset recognises

The build in this example names output files with an 8-character lowercase hex hash, such as `app-33b06492.js`. The `vanilla` preset in the core package matches that pattern and extracts `app` as the stable name. When a new release changes the content, the hash changes (for example to `app-7a91c3e1.js`), and `build-deltas` pairs the two files by their shared name to produce the delta.

## How to run it

You need Node.js 22.15 or later. Install dependencies from the repository root, then work inside this folder.

```bash
npm install   # run once from the repository root
cd examples/vanilla
npm run releases    # builds v1, v2 and v3, then computes deltas
npm run serve       # serves v1 at http://localhost:3000
```

Open the app in a Chromium-based browser with DevTools on the Network tab. Add the Content-Encoding column (right-click the column headers). You should see the bundle arrive with `use-as-dictionary` in its response headers.

Switch to v2 and reload.

```bash
npm run release -- v2
```

The main bundle should now arrive as `dcz`. The server log shows the dictionary it was compressed against and the size of the delta.

## Measured sizes

These figures were measured on a MacBook running Node.js 24.21.0. The sizes reflect the synthetic demo content, not a real application.

| Response | Raw | Brotli | dcz |
|---|---|---|---|
| App bundle v1 to v2 | 331.5 KB | 49.4 KB | 1.2 KB |

The delta is about 2.4% of the Brotli size. The saving is large here because the two versions differ by only a few lines, and the surrounding code (React, routing and so on) is identical.

## Running the tests

`npm test` regenerates all three releases and then runs a negotiation test over HTTP. The test sends an `Available-Dictionary` header by hand, decodes the response with the same codec the browser uses, and checks the result byte for byte against the expected file. It also checks that a browser presenting an unknown dictionary receives a normal Brotli response.

## The build step

The release script calls `build-deltas` from `@compression-dictionaries/core` after each build.

```bash
./node_modules/.bin/build-deltas \
  --preset vanilla \
  --current releases/v1/public/assets \
  --public-path /assets \
  --out releases/v1/deltas
```

`--dry-run` prints which files pair up without writing any output, which is the quickest way to check that the preset is finding the right files.

## Shared dictionary for product pages

The vanilla example serves a dictionary file at `/dictionaries/products.dat`. Its `Use-As-Dictionary` header says `match="/products/*"`, so the browser stores it and sends it when requesting any product detail page. The server uses the `sharedDictionary` middleware from `@compression-dictionaries/core` to compress each HTML response on the fly.

This is only demonstrated in the vanilla example. In the single-page app examples, product pages are client-side routes and there is no HTML response to compress.

## Notes for webpack users

Webpack with default settings assigns numeric chunk IDs, such as `825-c56ef468.js`. `build-deltas` skips these because a number alone is not a stable name; the same logical chunk can get a different number in the next build if other chunks are added or removed. If you use webpack, enable named chunks or use `optimization.chunkIds: 'named'` to get stable names that the tool can pair.
