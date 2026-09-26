// Verify that a Chromium-based browser receives content-encoding: dcz after
// downloading the v1 bundle and then requesting the v2 bundle.
// Run with: node verify-browser.mjs
// Requires: npm run releases in each example folder first.

import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))

// Wait for the server to print a line containing `marker` on stdout.
function waitForReady(proc, marker = 'Demo running', timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Server did not start within ${timeoutMs}ms`)), timeoutMs)
    proc.stdout.on('data', (chunk) => {
      if (chunk.toString().includes(marker)) {
        clearTimeout(timer)
        resolve()
      }
    })
  })
}

// Check an example that supports hot-swapping releases via current.txt.
// The server continues running while current.txt is rewritten between visits.
async function checkExample(name, port, releasesDir) {
  console.log(`\n--- ${name} ---`)

  const current = join(releasesDir, 'current.txt')
  writeFileSync(current, 'v1')

  const server = spawn(process.execPath, [join(here, 'examples', name, 'server.mjs')], {
    env: { ...process.env, PORT: String(port) },
  })

  await waitForReady(server)

  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()

  const dczResponses = []

  context.on('response', (res) => {
    const enc = res.headers()['content-encoding']
    if (enc === 'dcz') dczResponses.push(res.url())
  })

  try {
    // First visit: download v1 assets (browser stores them as dictionaries)
    await page.goto(`http://localhost:${port}`, { waitUntil: 'networkidle' })
    await page.goto(`http://localhost:${port}/transfers`, { waitUntil: 'networkidle' })

    // Switch to v2 (hot-swap: server reads current.txt per request)
    writeFileSync(current, 'v2')

    // Navigate again to trigger v2 bundle requests with Available-Dictionary.
    // Check v2 content on the dashboard first, then visit transfers to collect dcz responses.
    await page.goto(`http://localhost:${port}`, { waitUntil: 'networkidle' })

    // Assert v2 content is visible on the dashboard (greeting changes from v1 to v2).
    const dashText = await page.locator('body').textContent()
    if (dashText.includes('Good to see you') || dashText.includes('Release v2')) {
      const marker = dashText.includes('Good to see you') ? '"Good to see you"' : '"Release v2"'
      console.log(`✓ v2 content confirmed (${marker} visible on dashboard)`)
    } else if (dashText.includes('Welcome back') || dashText.includes('Release v1')) {
      console.log('✗ Still showing v1 content — v2 did not load')
    } else {
      console.log('  (could not identify greeting text to confirm v2 content)')
    }

    await page.goto(`http://localhost:${port}/transfers`, { waitUntil: 'networkidle' })

    if (dczResponses.length > 0) {
      // Count occurrences of each URL to surface duplicates clearly.
      const counts = {}
      for (const url of dczResponses) counts[url] = (counts[url] ?? 0) + 1
      const lines = Object.entries(counts).map(([url, n]) => (n > 1 ? `  ${url} (×${n})` : `  ${url}`))
      console.log(`✓ dcz responses received (${dczResponses.length} total):`)
      lines.forEach((l) => console.log(l))
    } else {
      console.log('✗ No dcz responses observed.')
    }
  } finally {
    await browser.close()
    server.kill()
    writeFileSync(current, 'v1')
  }
}

// Check Next.js, which requires a server restart to switch releases.
// Start on v1, record v1 bundles, stop, start on v2, check for dcz responses.
async function checkNextjs(port, releasesDir) {
  console.log('\n--- nextjs ---')

  const current = join(releasesDir, 'current.txt')
  const serverMjs = join(here, 'examples', 'nextjs', 'server.mjs')

  writeFileSync(current, 'v1')
  const serverV1 = spawn(process.execPath, [serverMjs], {
    env: { ...process.env, PORT: String(port) },
  })
  await waitForReady(serverV1)

  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()
  const dczResponses = []
  let serverV2 = null

  context.on('response', (res) => {
    const enc = res.headers()['content-encoding']
    if (enc === 'dcz') dczResponses.push(res.url())
  })

  try {
    // First visit on v1: browser stores the bundles as dictionaries.
    await page.goto(`http://localhost:${port}`, { waitUntil: 'networkidle' })
    await page.goto(`http://localhost:${port}/transfers`, { waitUntil: 'networkidle' })

    // Restart the server on v2.
    serverV1.kill()
    await new Promise((r) => serverV1.on('close', r))
    writeFileSync(current, 'v2')
    serverV2 = spawn(process.execPath, [serverMjs], {
      env: { ...process.env, PORT: String(port) },
    })
    await waitForReady(serverV2)

    // Visit v2: browser sends Available-Dictionary, server should respond with dcz.
    await page.goto(`http://localhost:${port}`, { waitUntil: 'networkidle' })

    const dashText = await page.locator('body').textContent()
    if (dashText.includes('Good to see you')) {
      console.log('✓ v2 content confirmed ("Good to see you" greeting visible on dashboard)')
    } else if (dashText.includes('Welcome back')) {
      console.log('✗ Still showing v1 content ("Welcome back" greeting) — v2 did not load')
    } else {
      console.log('  (could not identify v2 greeting text)')
    }

    await page.goto(`http://localhost:${port}/transfers`, { waitUntil: 'networkidle' })

    if (dczResponses.length > 0) {
      const counts = {}
      for (const url of dczResponses) counts[url] = (counts[url] ?? 0) + 1
      const lines = Object.entries(counts).map(([url, n]) => (n > 1 ? `  ${url} (×${n})` : `  ${url}`))
      console.log(`✓ dcz responses received (${dczResponses.length} total):`)
      lines.forEach((l) => console.log(l))
    } else {
      console.log('✗ No dcz responses observed.')
    }
  } finally {
    await browser.close()
    serverV1.kill()
    serverV2?.kill()
    writeFileSync(current, 'v1')
  }
}

const vanilla = join(here, 'examples', 'vanilla', 'releases')
const reactVite = join(here, 'examples', 'react-vite', 'releases')
const angular = join(here, 'examples', 'angular', 'releases')
const nextjs = join(here, 'examples', 'nextjs', 'releases')

if (!existsSync(join(vanilla, 'v1'))) {
  console.error('Run `npm run releases` in examples/vanilla first.')
  process.exit(1)
}
if (!existsSync(join(reactVite, 'v1'))) {
  console.error('Run `npm run releases` in examples/react-vite first.')
  process.exit(1)
}

await checkExample('vanilla', 3990, vanilla)
await checkExample('react-vite', 3991, reactVite)

if (existsSync(join(angular, 'v1'))) {
  await checkExample('angular', 3992, angular)
} else {
  console.log('\n--- angular ---')
  console.log('  Skipped: run `npm run releases` in examples/angular first.')
}

if (existsSync(join(nextjs, 'v1'))) {
  await checkNextjs(3993, nextjs)
} else {
  console.log('\n--- nextjs ---')
  console.log('  Skipped: run `npm run releases` in examples/nextjs first.')
}
