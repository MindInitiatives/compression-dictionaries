// Verify that a Chromium-based browser receives content-encoding: dcz after
// downloading the v1 bundle and then requesting the v2 bundle.
// Run with: node verify-browser.mjs
// Requires: npm run releases in examples/vanilla and examples/react-vite first.

import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))

async function checkExample(name, port, releasesDir, bundlePattern) {
  console.log(`\n--- ${name} ---`)

  const current = join(releasesDir, 'current.txt')
  writeFileSync(current, 'v1')

  const server = spawn(process.execPath, [join(here, 'examples', name, 'server.mjs')], {
    env: { ...process.env, PORT: String(port) },
  })

  await new Promise((resolve) => server.stdout.once('data', resolve))

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

    // Switch to v2
    writeFileSync(current, 'v2')

    // Clear Playwright's intercept cache but keep the browser's dictionary store.
    // Navigate again to trigger the v2 bundle request with Available-Dictionary.
    await page.goto(`http://localhost:${port}`, { waitUntil: 'networkidle' })
    await page.goto(`http://localhost:${port}/transfers`, { waitUntil: 'networkidle' })

    if (dczResponses.length > 0) {
      console.log(`✓ dcz responses received (${dczResponses.length}):`)
      dczResponses.forEach((u) => console.log(`  ${u}`))
    } else {
      console.log('✗ No dcz responses observed.')
      console.log('  Note: Compression Dictionary Transport requires a browser that supports')
      console.log('  the Available-Dictionary request header. Headless Chrome may not expose')
      console.log('  this header even when the feature flag is enabled. Check chrome://flags')
      console.log('  in a real browser to confirm the feature works end-to-end.')
    }
  } finally {
    await browser.close()
    server.kill()
    writeFileSync(current, 'v1')
  }
}

const vanilla = join(here, 'examples', 'vanilla', 'releases')
const reactVite = join(here, 'examples', 'react-vite', 'releases')

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
