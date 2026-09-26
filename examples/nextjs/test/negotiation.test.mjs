// End-to-end check of the header negotiation against the demo server.
// `npm test` runs releases first, then these tests over HTTP.

import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { sha256, decodeDcz } from '@compression-dictionaries/core/dcz'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const releases = join(root, 'releases')
const PORT = 3996
const base = `http://localhost:${PORT}`
let server

const setRelease = (name) => writeFileSync(join(releases, 'current.txt'), name)
const sfBytes = (buffer) => `:${sha256(buffer).toString('base64')}:`

// Find the main-app chunk URL by scanning the release's chunk directory.
function mainAppChunkUrl(version) {
  const dir = join(releases, version, '_next', 'static', 'chunks')
  const chunk = readdirSync(dir).find((f) => /^main-app-[0-9a-f]{16}\.js$/.test(f))
  if (!chunk) throw new Error(`Cannot find main-app chunk in ${version}`)
  return `/_next/static/chunks/${chunk}`
}

// Find the transfers page chunk URL in the app/transfers subdirectory.
function transfersChunkUrl(version) {
  const dir = join(releases, version, '_next', 'static', 'chunks', 'app', 'transfers')
  const chunk = readdirSync(dir).find((f) => /^page-[0-9a-f]{16}\.js$/.test(f))
  if (!chunk) throw new Error(`Cannot find transfers chunk in ${version}`)
  return `/_next/static/chunks/app/transfers/${chunk}`
}

before(async () => {
  setRelease('v1')
  server = spawn(process.execPath, [join(root, 'server.mjs')], {
    env: { ...process.env, PORT },
  })
  await new Promise((resolve) => server.stdout.once('data', resolve))
})

after(() => {
  server.kill()
  setRelease('v1')
})

test('first visit: main-app chunk is served and marked as a dictionary', async () => {
  setRelease('v1')
  const url = mainAppChunkUrl('v1')
  const res = await fetch(base + url, { headers: { 'Accept-Encoding': 'br, dcz' } })
  assert.equal(res.status, 200)
  assert.equal(res.headers.get('use-as-dictionary'), 'match="/_next/static/chunks/main-app-*.js"')
  assert.match(res.headers.get('vary'), /Available-Dictionary/i)
})

test('after a deploy: browser holding v1 transfers chunk receives a dcz delta for v2', async () => {
  setRelease('v1')
  const v1Url = transfersChunkUrl('v1')
  const v1 = readFileSync(join(releases, 'v1', v1Url))

  setRelease('v2')
  const v2Url = transfersChunkUrl('v2')
  const res = await fetch(base + v2Url, {
    headers: {
      'Accept-Encoding': 'gzip, br, zstd, dcb, dcz',
      'Available-Dictionary': sfBytes(v1),
    },
  })

  assert.equal(res.headers.get('content-encoding'), 'dcz')
  const body = Buffer.from(await res.arrayBuffer())
  const expected = readFileSync(join(releases, 'v2', v2Url))
  assert.ok(decodeDcz(body, v1).equals(expected), 'delta decodes to the v2 transfers chunk')
  assert.ok(body.length < expected.length / 5, 'delta is a small fraction of the file')
})

test('unknown dictionary falls back to Brotli', async () => {
  setRelease('v2')
  const res = await fetch(base + mainAppChunkUrl('v2'), {
    headers: {
      'Accept-Encoding': 'br, dcz',
      'Available-Dictionary': sfBytes(Buffer.from('something else')),
    },
  })
  assert.equal(res.headers.get('content-encoding'), 'br')
})
