# Compression dictionaries, applied to four stacks

Content-hashed filenames give you safe long-term caching, but every deploy changes the hash, so every returning user downloads the whole bundle again. Compression Dictionary Transport fixes that. The browser tells the server which version of a file it already holds, and the server sends the new version compressed against it, which is close to a diff.

This repository applies that idea to the same small banking app four times, once for each of plain HTML and JavaScript, React with Vite, Angular and Next.js. Pick the folder for your stack, run one command, and you can see exactly what it takes to make it work there.

## Pick your stack

| Folder | Stack | What it shows | Status |
|---|---|---|---|
| [`examples/vanilla`](examples/vanilla) | Plain HTML and JavaScript | Delta-compressed bundles, plus a shared dictionary for similar HTML pages | Ready |
| [`examples/react-vite`](examples/react-vite) | React with Vite | Deltas for the entry bundle and lazy-loaded Transfers route, served by a small Node server | Ready |
| [`examples/angular`](examples/angular) | Angular | Named chunks via `namedChunks: true`, and deltas served alongside Angular's SSR output | Ready |
| [`examples/nextjs`](examples/nextjs) | Next.js | Webpack builder for stable names, server components produce no deltas, only client components do | Ready |

The browser feature is identical in every folder. What changes between them is how each build tool names its files, which decides whether old and new versions can be paired, and where the app is served from, which decides where the negotiation happens.

## How the repository is organised

`packages/core` holds the logic every example shares. It builds the deltas at build time, checks each one decodes correctly, and provides Express middleware that chooses between a delta and normal Brotli at request time. None of this is copied into the examples, so a fix here reaches all of them.

`packages/demo-content` holds the data and stylesheet the app renders, so the four versions are the same app.

`docs/APP-SPEC.md` describes the app and the three releases each example builds.

`gists/` holds the short snippets embedded in the accompanying article.

## Run an example

You need Node.js 22.15 or later, which includes Zstandard in `node:zlib`. Install once at the root, then work inside any example folder.

```bash
npm install
cd examples/vanilla
npm run releases          # builds releases v1, v2 and v3, plus their deltas
npm run serve             # http://localhost:3000, serving v1
```

Open the page in a Chromium-based browser with DevTools on the Network tab. Right-click the column headers to add Content-Encoding. Then switch release and reload.

```bash
npm run release -- v2
```

The app bundle should now arrive as `dcz`, and the server log shows which dictionary it was compressed against.

Run `npm test` at the root to run every test in the repository.

To see the feature working in a real browser, run `npm run verify:browser`. It launches a headless Chromium, loads v1, switches to v2 and checks that the bundles arrive as `dcz`. It runs against `examples/vanilla` and `examples/react-vite`, which must have releases already built.

## What the vanilla example shows

These figures come from the vanilla example's generated bundle, which is synthetic. They illustrate the mechanism and should not be read as a benchmark for a real application.

| Response | Raw | Brotli | dcz |
|---|---|---|---|
| App bundle, v1 to v2 (5 functions changed, 2 added) | 331.5 KB | 50.6 KB | 1.2 KB |
| App bundle, v2 to v3 (10 more changed, 3 added) | 333.1 KB | 50.7 KB | 1.7 KB |
| App bundle, v1 to v3 (skipping a release) | 333.1 KB | 50.7 KB | 2.7 KB |
| Product page against the shared layout dictionary | 1.2 KB | 441 B | 123 B |

The skipped-release row is why the build step keeps deltas against more than one previous release. Users do not all update at the same pace.

## Applying it to your own project

Start with a dry run from a clone of this repository, pointed at two builds of your own project. It prints which files pair up between them, and it is the quickest way to find out whether your chunk names are stable.

```bash
node packages/core/src/build-deltas.mjs --preset vite \
  --current ../your-app/dist/assets --previous ../your-app/.previous-assets --dry-run
```

When you are ready to adopt it, copy `packages/core/src` into your project. It has no dependencies beyond Node.js, apart from Express for the middleware.

Stable names matter most. The `Use-As-Dictionary` header matches URLs by pattern, such as `/assets/app-*.js`, so a new file must be pairable with its old version by name. Numeric webpack chunk ids and anonymous `chunk-[hash].js` files cannot be paired, and the tool skips them with a message saying so.

You also need the previous release's files at build time. Many teams already keep old hashed assets in their bucket, so that users mid-session do not hit missing lazy chunks, and those files are the dictionaries.

Before launch, check your caching layer. Every response that can vary by dictionary sends `Vary: Accept-Encoding, Available-Dictionary`. If a CDN ignores that, it can serve a `dcz` body to a browser that cannot decode it. `gists/10-check-cdn-vary.sh` checks this.

Finally, measure in the right place. The saving appears only for returning users on their first visit after a deploy, so a lab test from a clean profile will show nothing. `gists/11-measure-transfer-size.js` tags real-user resource timings by visit type.

## Limitations

Browser support is currently limited to Chromium-based browsers, so treat this as progressive enhancement. Browsers without support never send `Available-Dictionary` and receive the normal response.

Dictionaries must be served over HTTPS (browsers treat localhost as a secure context, which is enough for local testing) and must be same-origin or CORS-readable with the requests that use them. Browsers clear them along with other site data.

This repository implements `dcz` only. The Brotli equivalent, `dcb`, works the same way but needs a Brotli build with custom dictionary support.

Zstandard support in `node:zlib` is marked experimental in Node.js.

## Further reading

The mechanism is specified by the IETF HTTP working group in [Compression Dictionary Transport](https://datatracker.ietf.org/doc/draft-ietf-httpbis-compression-dictionary/).

## Licence

MIT
