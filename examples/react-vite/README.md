# React with Vite

This example applies Compression Dictionary Transport to a React app built with Vite 8.3.1. It shows how the Vite bundler's default output naming makes file pairing work with no extra configuration, and how a small Express server adds the compression dictionary negotiation in front of static assets.

## What this example shows

Vite names each output file after its source, with an 8-character hash appended. The entry point becomes `assets/index-CeM2-VJ6.js` and the lazy-loaded Transfers route becomes `assets/Transfers-BDUvV7E9.js`. The `vite` preset in the core package matches these names and extracts the stable part (`index`, `Transfers`) for pairing. When a new release changes a file, the hash changes but the name stays the same, so `build-deltas` can find the pair and compute the delta.

The Transfers route is lazy-loaded with `React.lazy`, so it ends up in its own chunk. That means a user who has never visited the transfers page does not pay for its code. It also means the dictionary mechanism works separately for the entry bundle and for the transfers chunk: each one receives its own `Use-As-Dictionary` header and its own delta.

## How to run it

You need Node.js 22.15 or later. Install from the repository root, then work inside this folder.

```bash
npm install   # run once from the repository root
cd examples/react-vite
npm run releases    # builds v1, v2 and v3, then computes deltas
npm run serve       # serves v1 at http://localhost:3001
```

Open the app in a Chromium-based browser with DevTools on the Network tab. Add the Content-Encoding column. Request the Transfers page so the browser stores that chunk as a dictionary.

Switch to v2 and reload.

```bash
npm run release -- v2
```

The entry bundle and the Transfers chunk should arrive as `dcz`. The server log shows which dictionary each was compressed against.

## Measured sizes

These figures were measured on a MacBook running Node.js 24.21.0.

| Bundle | Raw | Brotli | dcz (v1 to v2) |
|---|---|---|---|
| Entry bundle (`index-*.js`) | 264.1 KB | 70.0 KB | 0.1 KB |
| Transfers chunk (`Transfers-*.js`) | 1.2 KB | 0.5 KB | 0.2 KB |

The entry bundle delta is very small (0.1 KB) because only the greeting text changes between v1 and v2. The Transfers chunk delta is proportionally larger because a new fee estimate feature is added to that page.

## Vite's hash format

Vite (which uses Rollup under the hood) produces an 8-character base64url hash. Unlike some other bundlers, this hash can contain hyphens and underscores, so the `vite` preset uses the character class `[A-Za-z0-9_-]{8}` rather than a hex range. You can confirm the real format by running `build-deltas --dry-run` and checking that your files are matched.

## How the release overlays work

The release script builds three releases without modifying the source tree. It copies the source to a temporary directory, applies the v2 changes on top, builds, applies the v3 changes, builds again, and then deletes the temporary directory. The v2 and v3 files live in `release-overlays/v2/` and `release-overlays/v3/`.

## Running the tests

`npm test` regenerates all three releases and then runs a negotiation test over HTTP. The test proves that a browser holding the v1 main bundle receives a `dcz` delta for v2 that decodes byte for byte to the v2 file. It makes the same check for the Transfers chunk, and verifies that an unknown dictionary falls back to Brotli.

## Shared-dictionary compression

Product pages are client-side routes in this app, so there is no server-rendered HTML to compress. The shared-dictionary feature demonstrated in the vanilla example does not apply here.

## Notes for older webpack setups

Older setups based on Create React App or a custom webpack configuration often produce numeric chunk IDs such as `825-c56ef468.js`. `build-deltas` skips these because a number is not stable: it can change if other chunks are added or removed in the next build. If you are on webpack, set `optimization.chunkIds: 'named'` to get stable names.
