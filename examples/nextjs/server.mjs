// Custom server: run dictionaryDeltas before handing requests to Next.js.
// The delta middleware intercepts /_next/static/chunks requests and serves
// a prebuilt dcz delta when the browser holds a previous version as a dictionary.
// All other requests, including page rendering, go to Next.js as normal.

import express from 'express'
import next from 'next'
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { dictionaryDeltas } from '@compression-dictionaries/core/middleware'

const here = dirname(fileURLToPath(import.meta.url))
const releasesDir = join(here, 'releases')

if (!existsSync(join(releasesDir, 'current.txt'))) {
  console.error('No releases found. Run `npm run releases` first.')
  process.exit(1)
}

const current = readFileSync(join(releasesDir, 'current.txt'), 'utf8').trim()
const releaseDir = join(releasesDir, current)
const manifest = JSON.parse(readFileSync(join(releaseDir, 'deltas', 'manifest.json'), 'utf8'))

// next.config.mjs reads NEXT_DIST_DIR to set distDir. Set it here so
// Next.js picks up the correct release directory. Pass a path relative to
// `here` because Next.js resolves distDir with path.join(dir, distDir).
const distDir = relative(here, join(releaseDir, '.next'))
process.env.NEXT_DIST_DIR = distDir

// Load the Next.js built app from this release's .next directory.
const app = next({ dev: false, dir: here })
const handle = app.getRequestHandler()
await app.prepare()

const server = express()
server.disable('x-powered-by')

server.use(dictionaryDeltas({
  manifest: () => manifest,
  deltasDir: () => join(releaseDir, 'deltas'),
  log: (line) => console.log(`[${current}] ${line}`),
}))

// Pass everything else to Next.js: static assets, page rendering, and routes.
server.use((req, res) => handle(req, res))

const port = Number(process.env.PORT ?? 3003)
server.listen(port, () => {
  console.log(`Demo running at http://localhost:${port} (release ${current})`)
  console.log('To switch releases, run `npm run release -- v2` then restart with `npm run serve`.')
})
