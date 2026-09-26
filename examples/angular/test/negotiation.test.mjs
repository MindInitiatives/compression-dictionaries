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
const PORT = 3997
const base = `http://localhost:${PORT}`
let server

const setRelease = (name) => writeFileSync(join(releases, 'current.txt'), name)
const sfBytes = (buffer) => `:${sha256(buffer).toString('base64')}:`

// Parse the main bundle URL from a release's index.csr.html.
// Angular outputs index.csr.html (not index.html) when outputMode is "server".
function mainBundleUrl(version) {
  const html = readFileSync(join(releases, version, 'browser', 'index.csr.html'), 'utf8')
  const m = /src="(main-[A-Z0-9]{8}\.js)"/.exec(html)
  if (!m) throw new Error(`Cannot find main bundle in ${version} index.csr.html`)
  return `/${m[1]}`
}

// Find the transfers chunk URL by scanning the browser directory.
function transfersChunkUrl(version) {
  const dir = join(releases, version, 'browser')
  const chunk = readdirSync(dir).find((f) => /^transfers\.component-[A-Z0-9]{8}\.js$/.test(f))
  if (!chunk) throw new Error(`Cannot find transfers chunk in ${version}/browser`)
  return `/${chunk}`
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

test('first visit: main bundle is served and marked as a dictionary', async () => {
  setRelease('v1')
  const url = mainBundleUrl('v1')
  const res = await fetch(base + url, { headers: { 'Accept-Encoding': 'br, dcz' } })
  assert.equal(res.status, 200)
  assert.equal(res.headers.get('use-as-dictionary'), 'match="/main-*.js"')
  assert.match(res.headers.get('vary'), /Available-Dictionary/i)
})

test('after a deploy: browser holding v1 receives a dcz delta for v2', async () => {
  setRelease('v1')
  const v1Url = mainBundleUrl('v1')
  const v1 = readFileSync(join(releases, 'v1', 'browser', v1Url))

  setRelease('v2')
  const v2Url = mainBundleUrl('v2')
  const res = await fetch(base + v2Url, {
    headers: {
      'Accept-Encoding': 'gzip, br, zstd, dcb, dcz',
      'Available-Dictionary': sfBytes(v1),
    },
  })

  assert.equal(res.headers.get('content-encoding'), 'dcz')
  const body = Buffer.from(await res.arrayBuffer())
  const expected = readFileSync(join(releases, 'v2', 'browser', v2Url))
  assert.ok(decodeDcz(body, v1).equals(expected), 'delta decodes to the v2 file')
  assert.ok(body.length < expected.length / 10, 'delta is a small fraction of the file')
})

test('transfers chunk also gets a dcz delta', async () => {
  setRelease('v1')
  const v1Url = transfersChunkUrl('v1')
  const v1 = readFileSync(join(releases, 'v1', 'browser', v1Url))

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
  const expected = readFileSync(join(releases, 'v2', 'browser', v2Url))
  assert.ok(decodeDcz(body, v1).equals(expected), 'transfers chunk delta decodes correctly')
})

test('unknown dictionary falls back to Brotli', async () => {
  setRelease('v2')
  const res = await fetch(base + mainBundleUrl('v2'), {
    headers: {
      'Accept-Encoding': 'br, dcz',
      'Available-Dictionary': sfBytes(Buffer.from('something else')),
    },
  })
  assert.equal(res.headers.get('content-encoding'), 'br')
})
