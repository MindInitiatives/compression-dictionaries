# React with Vite

Status: not built yet. This file holds the expected approach, which must be confirmed against real build output while implementing.

## Expected approach

Vite names output files after their source by default, so the entry comes out as `assets/index-[hash].js` and lazy-loaded routes get names based on their components, such as `assets/Transfers-[hash].js`. Old and new versions should pair by name with no configuration, using the `vite` preset.

A Vite app is static files, so the negotiation needs a server in front. This example should use a small Express server with `dictionaryDeltas` and `compressedStatic` from the core package, falling back to `index.html` for client-side routes.

Things to confirm while building are the exact hash length and character set Rollup uses in the installed Vite version, whether the CSS file pairs as well as the JavaScript, and that a `manualChunks` setting (if any) produces stable names.

## Older webpack setups

Create React App and many custom webpack configurations name lazy chunks with numeric ids. Those can shift between builds, so the tool skips them. This is worth one short section in the finished README for readers not on Vite.
