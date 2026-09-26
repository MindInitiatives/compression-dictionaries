// Demo server. Serves whichever release is named in releases/current.txt.
// Uses the same dictionaryDeltas middleware as the other examples; the static
// export means we do not need to run Next.js at serve time.

import express from 'express'
import { readFileSync, existsSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { dictionaryDeltas, compressedStatic } from '@compression-dictionaries/core/middleware'

const here = dirname(fileURLToPath(import.meta.url))
const releasesDir = join(here, 'releases')

if (!existsSync(join(releasesDir, 'current.txt'))) {
  console.error('No releases found. Run `npm run releases` first.')
  process.exit(1)
}

const current = () => readFileSync(join(releasesDir, 'current.txt'), 'utf8').trim()
const releasePath = (...parts) => join(releasesDir, current(), ...parts)

let manifestCache = { release: null, value: null }
const manifest = () => {
  if (manifestCache.release !== current()) {
    manifestCache = {
      release: current(),
      value: JSON.parse(readFileSync(releasePath('deltas', 'manifest.json'), 'utf8')),
    }
  }
  return manifestCache.value
}

const log = (line) => console.log(`[${current()}] ${line}`)
const app = express()
app.disable('x-powered-by')

app.use(dictionaryDeltas({ manifest, deltasDir: () => releasePath('deltas'), log }))

// /_next/static/ assets are content-hashed and immutable once deployed.
app.use(compressedStatic({
  root: () => releasePath(),
  cacheControl: (path) =>
    path.startsWith('_next/static/') ? 'public, max-age=31536000, immutable' : 'no-cache',
  log,
}))

// Serve HTML pages for Next.js static export routes.
// The export writes /transfers → transfers.html rather than transfers/index.html,
// so we add the .html suffix when looking up the file on disk.
app.use((req, res) => {
  const htmlPath = req.path === '/' ? 'index.html' : req.path.replace(/^\//, '') + '.html'
  const filePath = releasePath(htmlPath)
  try {
    if (statSync(filePath).isFile()) {
      res.set('Cache-Control', 'no-cache')
      res.sendFile(filePath)
      return
    }
  } catch { /* file not found */ }
  res.status(404).send('Not found')
})

const port = Number(process.env.PORT ?? 3003)
app.listen(port, () => {
  console.log(`Demo running at http://localhost:${port} (release ${current()})`)
  console.log('Open it in a Chromium-based browser with DevTools open on the Network tab.')
})
