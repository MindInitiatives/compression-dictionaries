// Angular SSR server with delta middleware added before the static file handler.
// The manifest is read at runtime because it is generated after ng build runs.
//
// This file is compiled as part of ng build. In production, run the compiled
// output at dist/angular/server/server.mjs (or releases/vN/server/server.mjs).

import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node'
import express from 'express'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { dictionaryDeltas } from '@compression-dictionaries/core/middleware'

const browserDistFolder = join(import.meta.dirname, '../browser')
const deltasFolder = join(import.meta.dirname, '../deltas')

const app = express()
const angularApp = new AngularNodeAppEngine()

// Serve delta-compressed assets when the client holds a previous version.
// The manifest is absent before the first `ng build`, so fall back gracefully.
let manifest: any = null
if (existsSync(join(deltasFolder, 'manifest.json'))) {
  manifest = JSON.parse(readFileSync(join(deltasFolder, 'manifest.json'), 'utf8'))
}

app.use(
  dictionaryDeltas({
    manifest: () => manifest,
    deltasDir: () => deltasFolder,
  }),
)

app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
)

app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) => (response ? writeResponseToNodeResponse(response, res) : next()))
    .catch(next)
})

if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000
  app.listen(port, (error?: Error) => {
    if (error) throw error
    console.log(`Node Express server listening on http://localhost:${port}`)
  })
}

export const reqHandler = createNodeRequestHandler(app)
