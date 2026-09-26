# Angular

Status: not built yet. This file holds the expected approach, which must be confirmed against real build output while implementing.

## Expected approach

The esbuild-based application builder should give entry files stable names (`main-[hash].js`, `polyfills-[hash].js`, `styles-[hash].css`) with an 8-character uppercase hash. Lazy-loaded chunks come out as `chunk-[hash].js` by default, which cannot be paired between releases.

Setting `"namedChunks": true` in the production configuration in `angular.json` should give lazy chunks names based on their source. The finished README should show real filenames from the build before and after that change, because it is the single most useful thing this example teaches.

This example should use Angular SSR, since its generated `server.ts` is already an Express server, and add `dictionaryDeltas` before the static file handler. The manifest must be read at runtime, because it is written after `ng build` compiles the server.

Things to confirm while building are the actual hash format, the output folder layout under `dist/`, the public path the browser requests assets from, and whether the SSR engine in the installed version streams its HTML response.

## Hosting note for the README

Many Angular apps are served from nginx, IIS or a storage bucket, and none of those can negotiate dictionary encodings on their own. The finished README should explain the options (a Node server in front, an edge function, or a CDN with native support) in plain terms.
