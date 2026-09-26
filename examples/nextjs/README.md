# Next.js

This example applies Compression Dictionary Transport to a Next.js 16 app using the App Router and static export. It documents which bundler to use and why, and shows how a plain Express server adds the compression dictionary negotiation in front of the pre-built static files.

## Turbopack versus webpack

Next.js 16 uses Turbopack by default for production builds. Turbopack names chunks with content-addressed IDs that do not carry a stable prefix, such as `0bma92pht_c97.js`. Because there is no stable name to extract before the hash, `build-deltas` cannot pair a file from one release with the corresponding file from the next.

The webpack bundler names its output differently. The entry chunk becomes `main-app-bd3544572809f5db.js`, with a stable name followed by a 16-character hex hash. The `next-webpack` preset in the core package matches this pattern. The release script passes `--webpack` to `next build` explicitly.

If Next.js stabilises Turbopack's naming scheme in a future version, a `next-turbopack` preset would be straightforward to add. Run `build-deltas --dry-run` to check the real output before adopting either.

## What changes between releases

The dashboard and product pages in this example are React server components. They render to static HTML at build time and produce no client-side JavaScript of their own. When the dashboard greeting changes between v1 and v2, only the pre-rendered HTML changes; the JavaScript bundle hash stays the same, so there is no delta to compute for it.

The Transfers page uses `'use client'` and ships actual JavaScript. When the fee estimate feature is added in v2, that JavaScript changes, the hash changes, and `build-deltas` produces a delta.

| Bundle | Raw | Brotli | dcz (v1 to v2) |
|---|---|---|---|
| Transfers page chunk (`app/transfers/page-*.js`) | 2.2 KB | 0.9 KB | 0.2 KB |

These figures were measured on a MacBook running Node.js 24.21.0.

## Dynamic route segments

Next.js uses `[id]` in filesystem paths to mark dynamic segments, such as `app/products/[id]/page-*.js`. Square brackets have special meaning in URLPattern, so `build-deltas` skips these chunks and does not set `Use-As-Dictionary` for them. If a future version changes that route's code, no delta would be sent for it. The product pages in this demo never change between releases, so there is nothing to lose.

## How to run it

You need Node.js 22.15 or later. Install from the repository root, then work inside this folder.

```bash
npm install   # run once from the repository root
cd examples/nextjs
npm run releases    # builds v1, v2 and v3, then computes deltas
npm run serve       # serves v1 at http://localhost:3003
```

Open the app in a Chromium-based browser with DevTools on the Network tab. Add the Content-Encoding column. Navigate to the Transfers page so the browser downloads and stores the transfers chunk.

Switch to v2 and reload.

```bash
npm run release -- v2
```

The transfers chunk should now arrive as `dcz`.

## How the demo server works

This example uses `output: 'export'` in `next.config.mjs`, which produces a flat static site in an `out/` directory. The demo server in `server.mjs` is a plain Express app that serves those files directly: it adds the delta middleware before the static handler, and maps URL paths to `.html` files for routes like `/transfers`.

This approach suits the "switch between releases" demo. In a real application you would run `next start` with a custom Express server that calls `next()` for the handler, and add `dictionaryDeltas` before it. A custom server opts out of some of Next.js's own optimisations, such as automatic static acceleration; check the Next.js documentation for your hosting platform before adopting it.

## Running the tests

`npm test` regenerates all three releases and then runs a negotiation test over HTTP. The test checks that the main-app chunk is served with a `Use-As-Dictionary` header, that a browser holding the v1 transfers chunk receives a `dcz` delta for v2, and that an unknown dictionary falls back to Brotli.

## Shared-dictionary compression

Product pages are server-rendered HTML in this app, but they are generated statically at build time rather than streamed. Because the pages are static files served directly, the `sharedDictionary` middleware could in principle compress them against a shared template. This is not shown here, as the vanilla example already demonstrates the pattern clearly.

## Hosting note

Whether this technique is useful on a managed platform depends on the platform's CDN. Some platforms intercept the `Vary: Accept-Encoding, Available-Dictionary` header and may not pass `Available-Dictionary` to the origin, which means the server never receives the dictionary fingerprint. Check your platform's documentation before enabling this in production.
