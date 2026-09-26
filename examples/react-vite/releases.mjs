// Builds three releases of the React app and runs build-deltas for each one.
// The source tree is left unchanged; all intermediate work happens in .release-work/.

import { cpSync, rmSync, mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { build } from 'vite'
import react from '@vitejs/plugin-react'

const here = dirname(fileURLToPath(import.meta.url))
const work = join(here, '.release-work')
const releasesDir = join(here, 'releases')
const buildDeltas = fileURLToPath(import.meta.resolve('@compression-dictionaries/core/build-deltas'))
const quiet = process.argv.includes('--quiet')

rmSync(releasesDir, { recursive: true, force: true })
rmSync(work, { recursive: true, force: true })

mkdirSync(join(work, 'src'), { recursive: true })
cpSync(join(here, 'src'), join(work, 'src'), { recursive: true })
cpSync(join(here, 'index.html'), join(work, 'index.html'))

await buildRelease('v1', [])
applyOverlay('v2')
await buildRelease('v2', ['v1'])
applyOverlay('v3')
await buildRelease('v3', ['v2', 'v1'])

rmSync(work, { recursive: true, force: true })
writeFileSync(join(releasesDir, 'current.txt'), 'v1')

if (!quiet) console.log('\nReleases written to examples/react-vite/releases. Current release: v1')

function applyOverlay(version) {
  const overlayDir = join(here, 'release-overlays', version)
  if (existsSync(overlayDir)) {
    cpSync(overlayDir, work, { recursive: true })
  }
}

async function buildRelease(name, previousNames) {
  const outDir = join(releasesDir, name, 'public')

  if (!quiet) console.log(`\nBuilding ${name}...`)

  await build({
    root: work,
    plugins: [react()],
    build: {
      outDir,
      emptyOutDir: true,
      cssCodeSplit: true,
    },
    logLevel: quiet ? 'silent' : 'info',
  })

  const assetsDir = join(outDir, 'assets')
  const previous = previousNames.flatMap((n) => [
    '--previous', join(releasesDir, n, 'public', 'assets'),
  ])

  execFileSync(process.execPath, [
    buildDeltas,
    '--preset', 'vite',
    '--current', assetsDir,
    ...previous,
    '--public-path', '/assets',
    '--out', join(releasesDir, name, 'deltas'),
  ], { stdio: quiet ? 'ignore' : 'inherit' })
}
