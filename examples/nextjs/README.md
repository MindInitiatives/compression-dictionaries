# Next.js

This example applies Compression Dictionary Transport to a Next.js 16 app using the App Router and a custom Express server. It documents which bundler to use and why, and shows how the delta middleware fits into a server that also hands requests to Next.js's own handler.

## Turbopack versus webpack

Next.js 16 uses Turbopack by default for production builds. Turbopack names chunks with content-addressed IDs that do not carry a stable prefix, such as `0bma92pht_c97.js`. Because there is no stable name to extract before the hash, `build-deltas` cannot pair a file from one release with the corresponding file from the next.

The webpack bundler names its output differently. The entry chunk becomes `main-app-bd3544572809f5db.js`, with a stable name followed by a 16-character hex hash. The `next-webpack` preset in the core package matches this pattern. The release script passes `--webpack` to `next build` explicitly.

If Next.js stabilises Turbopack's naming scheme in a future version, a `next-turbopack` preset would be straightforward to add. Run `build-deltas --dry-run` to check the real output before adopting either.

## What changes between releases

The dashboard and product pages in this example are React server components. They render to static HTML at build time and produce no client-side JavaScript of their own. When the dashboard greeting changes between v1 and v2, only the pre-rendered HTML changes; the JavaScript bundle hash stays the same, so there is no delta to compute for it.

The Transfers page uses `'use client'` and ships actual JavaScript. When the fee estimate feature is added in v2, that JavaScript changes, the hash changes, and `build-deltas` produces a delta.

| Bundle | Raw (v2) | Brotli (v2) | dcz (v1 to v2) |
|---|---|---|---|
| Transfers page chunk (`app/transfers/page-*.js`) | 2.2 KB | 0.9 KB | 0.2 KB |
| Main app entry (`main-app-*.js`) | 0.5 KB | 0.2 KB | — |

The main app entry hash is stable across all three releases because it contains only the Next.js App Router bootstrap code and does not embed any release-specific content. It gets a `Use-As-Dictionary` response header on the first visit but there is no delta to deliver on subsequent visits. These figures were measured on a MacBook running Node.js 24.21.0.

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

Open the app in a Chromium-based browser with DevTools on the Network tab. Add the Content-Encoding column. Navigate to the Transfers page so the browser downloads and stores the transfers chunk as a dictionary.

To switch to v2, update `current.txt` and restart the server.

```bash
npm run release -- v2
npm run serve
```

The transfers chunk should now arrive as `dcz`.

## How the demo server works

The server in `server.mjs` is a custom Express app that loads Next.js at startup and calls `app.getRequestHandler()` to obtain a handler for all requests. The `dictionaryDeltas` middleware runs before the Next.js handler: when a request carries `Available-Dictionary` and a matching delta exists, the middleware serves the delta and the Next.js handler is not called. When no delta applies, the middleware sets the `Use-As-Dictionary` and `Vary` headers and calls `next()`, and Next.js handles the request as normal.

Each release is built to its own `.next` directory (`releases/vN/.next`). The server reads `releases/current.txt` at startup to decide which release to load. Switching releases therefore requires a server restart, which is why `npm run release -- v2` prints a reminder to restart.

The custom server does not apply any content encoding to static assets. Brotli or gzip compression would normally be handled by a CDN or reverse proxy in front of the server. When a browser sends an `Available-Dictionary` header but no matching delta exists, the middleware sets the required headers and passes the request to Next.js, which returns the raw file with no `Content-Encoding` header.

A real application would normally run `next start` rather than a custom server. A custom server opts out of some of Next.js's own optimisations; check the Next.js documentation for your hosting platform before adopting this pattern.

## Running the tests

`npm test` regenerates all three releases and then runs a negotiation test over HTTP. The test starts the server on v2, reads the v1 transfers chunk from disk to simulate a browser that holds the old bundle, then requests the v2 URL with `Available-Dictionary` set to v1's hash. It checks that the response is a valid dcz delta and that an unknown dictionary does not produce a dcz response.

## Shared-dictionary compression

Product pages are server-rendered HTML in this app, generated statically at build time. Because the pages are served by Next.js directly, the `sharedDictionary` middleware is not used here. The vanilla example already demonstrates that pattern clearly.

## Hosting note

Whether this technique is useful on a managed platform depends on the platform's CDN. Some platforms intercept the `Vary: Accept-Encoding, Available-Dictionary` header and may not pass `Available-Dictionary` to the origin, which means the server never receives the dictionary fingerprint. Check your platform's documentation before enabling this in production.
