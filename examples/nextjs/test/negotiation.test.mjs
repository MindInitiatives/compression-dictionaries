// End-to-end check of the header negotiation against the custom Next.js server.
// `npm test` runs releases first, then these tests over HTTP.
//
// The custom server loads a single release at startup, so the delta test reads
// v1 from disk to simulate a browser that already holds the old bundle, then
// requests the v2 URL from the server (which is running on v2).

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

// Find the main-app chunk URL by scanning the release's built chunks directory.
function mainAppChunkUrl(version) {
  const dir = join(releases, version, '.next', 'static', 'chunks')
  const chunk = readdirSync(dir).find((f) => /^main-app-[0-9a-f]{16}\.js$/.test(f))
  if (!chunk) throw new Error(`Cannot find main-app chunk in ${version}`)
  return `/_next/static/chunks/${chunk}`
}

// Find the transfers page chunk in the app/transfers subdirectory.
function transfersChunk(version) {
  const dir = join(releases, version, '.next', 'static', 'chunks', 'app', 'transfers')
  const chunk = readdirSync(dir).find((f) => /^page-[0-9a-f]{16}\.js$/.test(f))
  if (!chunk) throw new Error(`Cannot find transfers chunk in ${version}`)
  return {
    url: `/_next/static/chunks/app/transfers/${chunk}`,
    bytes: readFileSync(join(dir, chunk)),
  }
}

before(async () => {
  // The custom server loads the release at startup, so set current.txt to v2
  // before spawning. The test then reads v1 from disk as the "dictionary".
  setRelease('v2')
  server = spawn(process.execPath, [join(root, 'server.mjs')], {
    env: { ...process.env, PORT },
  })
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Server did not start in time')), 30000)
    server.stdout.on('data', (chunk) => {
      if (chunk.toString().includes('Demo running')) {
        clearTimeout(timeout)
        resolve()
      }
    })
    server.stderr.on('data', (chunk) => process.stderr.write(chunk))
  })
})

after(() => {
  server.kill()
  setRelease('v1')
})

test('first visit: main-app chunk is served and marked as a dictionary', async () => {
  const url = mainAppChunkUrl('v2')
  const res = await fetch(base + url, { headers: { 'Accept-Encoding': 'br, dcz' } })
  assert.equal(res.status, 200)
  assert.equal(res.headers.get('use-as-dictionary'), 'match="/_next/static/chunks/main-app-*.js"')
  assert.match(res.headers.get('vary'), /Available-Dictionary/i)
})

test('after a deploy: browser holding v1 transfers chunk receives a dcz delta for v2', async () => {
  const v1 = transfersChunk('v1')
  const v2 = transfersChunk('v2')

  const res = await fetch(base + v2.url, {
    headers: {
      'Accept-Encoding': 'gzip, br, zstd, dcb, dcz',
      'Available-Dictionary': sfBytes(v1.bytes),
    },
  })

  assert.equal(res.headers.get('content-encoding'), 'dcz')
  const body = Buffer.from(await res.arrayBuffer())
  assert.ok(decodeDcz(body, v1.bytes).equals(v2.bytes), 'delta decodes to the v2 transfers chunk')
  assert.ok(body.length < v2.bytes.length / 5, 'delta is a small fraction of the file')
})

test('unknown dictionary: file is served without content encoding', async () => {
  // The Next.js custom server does not apply compression to static assets;
  // a CDN or reverse proxy handles that in production. When the dictionary is
  // unknown, dictionaryDeltas calls next() and Next.js serves the raw file.
  const res = await fetch(base + mainAppChunkUrl('v2'), {
    headers: {
      'Accept-Encoding': 'br, dcz',
      'Available-Dictionary': sfBytes(Buffer.from('something else')),
    },
  })
  assert.equal(res.status, 200)
  assert.equal(res.headers.get('content-encoding'), null,
    'Next.js custom server returns uncompressed content when no delta applies')
})
