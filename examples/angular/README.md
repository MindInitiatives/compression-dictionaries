# Angular

This example applies Compression Dictionary Transport to an Angular 22 app using the `@angular/build:application` builder with server-side rendering enabled. It shows how to give lazy-loaded chunks stable, pairable names, and how to wire the delta middleware into the demo server.

## What this example shows

Angular's production build uses 8-character uppercase alphanumeric hashes, such as `main-D5OEQSHX.js`. The `angular` preset in the core package matches that pattern. Without any extra configuration, the lazy-loaded Transfers route ends up in a chunk named `chunk-TRY4S74S.js`. The name `chunk` is not stable across builds, so `build-deltas` skips it.

Setting `namedChunks: true` in the production configuration in `angular.json` changes that. The same chunk becomes `transfers.component-VAQA7ZJ7.js`, with the component name as the stable prefix. `build-deltas` can now pair it across releases and compute a delta.

## How namedChunks changes the output

Without `namedChunks: true`:

```
Lazy chunk files                 | Names
chunk-TRY4S74S.js                | transfers-component
```

With `namedChunks: true`:

```
Lazy chunk files                 | Names
transfers.component-VAQA7ZJ7.js  | transfers-component
```

The filename now carries a stable prefix. `build-deltas` uses the part before the last hyphen and hash as the pairing key.

## How the v2 and v3 changes are applied

Angular's build system supports `fileReplacements` in its configuration object. The `angular.json` in this example defines two extra configurations, `production-v2` and `production-v3`, each listing which source files to swap before building. The release script builds three times:

```
ng build --configuration=production
ng build --configuration=production,production-v2
ng build --configuration=production,production-v3
```

The source tree is never modified. The replacement files live in `release-overlays/v2/` and `release-overlays/v3/`.

## How to run it

You need Node.js 22.15 or later. Install from the repository root, then work inside this folder.

```bash
npm install   # run once from the repository root
cd examples/angular
npm run releases    # builds v1, v2 and v3, then computes deltas
npm run serve       # serves v1 at http://localhost:3002
```

Open the app in a Chromium-based browser with DevTools on the Network tab. Add the Content-Encoding column. Navigate to the Transfers page so the browser downloads and stores the transfers chunk.

Switch to v2 and reload.

```bash
npm run release -- v2
```

The demo server uses `index.csr.html`, which Angular produces when `outputMode` is set to `server`. This is the client-side rendered shell; the SSR bundle is not used at demo time.

## Measured sizes

These figures were measured on a MacBook running Node.js 24.21.0.

| Bundle | Raw | Brotli | dcz (v1 to v2) |
|---|---|---|---|
| Main bundle (`main-*.js`) | 99.7 KB | 25.8 KB | 0.1 KB |
| Transfers chunk (`transfers.component-*.js`) | 43.8 KB | 9.6 KB | 1.0 KB |

The main bundle delta is very small because the greeting text change ends up only in that chunk. The Transfers chunk is larger because a fee estimate feature is added there.

## Running the tests

`npm test` regenerates all three releases and then runs a negotiation test over HTTP. The test verifies that a browser holding the v1 main bundle receives a `dcz` delta for v2, decodes it, and gets the exact v2 bytes. It makes the same check for the transfers component chunk, and verifies the Brotli fallback.

## Shared-dictionary compression

The HTML in this app is served by Angular's SSR server, which streams responses. The `sharedDictionary` middleware in the core package cannot wrap a streamed response, so the shared-dictionary feature demonstrated in the vanilla example does not apply here.

## Hosting note

When running behind a CDN, every asset that can vary by dictionary has `Vary: Accept-Encoding, Available-Dictionary` in its response. If your CDN does not respect the `Vary` header, it can serve a `dcz` body to a browser that cannot decode it. Check your platform's documentation before enabling this in production.
