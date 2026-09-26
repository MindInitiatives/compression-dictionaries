// Production Next.js custom server: run dictionaryDeltas before handing
// each request to Next.js. Use `next build --webpack` so the output files
// carry stable name-hash filenames that the next-webpack preset can pair.
// A custom server opts out of some of Next.js's own optimisations; check
// your hosting platform's documentation before adopting this pattern.
import express from 'express'
import next from 'next'
import { readFileSync } from 'node:fs'
import { dictionaryDeltas } from '@compression-dictionaries/core/middleware'

const app = next({ dev: false })
const handle = app.getRequestHandler()
await app.prepare()

const manifest = JSON.parse(readFileSync('.next/deltas/manifest.json', 'utf8'))
const server = express()
server.use(dictionaryDeltas({ manifest: () => manifest, deltasDir: () => '.next/deltas' }))
server.use((req, res) => handle(req, res))
server.listen(3000)
