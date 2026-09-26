# Next.js

Status: not built yet. This file holds the expected approach, which must be confirmed against real build output while implementing.

## Expected approach

Next.js serves hashed assets from `/_next/static/` and writes them to `.next/static/`. With the webpack builder, files carry a 16-character hex hash with a stable prefix. Recent versions build with Turbopack by default, which names chunks differently. The first job is to build the app twice and inspect the real output, then decide between adding a Turbopack preset to the core package or building with webpack. Prefer supporting the default builder if its names can be paired reliably, and document the choice either way.

This example should use a custom Express server that runs `dictionaryDeltas` before handing every other request to Next.js. The finished README should mention that a custom server opts out of some of Next.js's own optimisations.

Things to confirm while building are the builder in use, the chunk naming scheme, which chunk holds the transfers page, and whether Next.js sets its own `Cache-Control` headers on `/_next/static/` that interact with the middleware.

## Hosting note for the README

On a managed platform, whether this is possible depends on the platform's CDN. The README should tell readers to check their platform's documentation, without claiming support either way.
