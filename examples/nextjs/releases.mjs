// Builds three releases of the Next.js app using a temporary working directory
// so the source tree is never modified between builds.
// The webpack builder is used explicitly because its stable name-hash filenames
// are required for dictionary pairing; Turbopack's content-addressed names
// do not carry a stable prefix, so they cannot be paired across releases.

import { cpSync, mkdirSync, rmSync, copyFileSync, writeFileSync } from 'node:fs'
import { join, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'

const here = dirname(fileURLToPath(import.meta.url))
const releasesDir = join(here, 'releases')
const workDir = join(here, '.release-work')
const buildDeltas = fileURLToPath(import.meta.resolve('@compression-dictionaries/core/build-deltas'))
const workspaceRoot = join(here, '..', '..')
const next = join(workspaceRoot, 'node_modules', '.bin', 'next')
const quiet = process.argv.includes('--quiet')

rmSync(releasesDir, { recursive: true, force: true })
rmSync(workDir, { recursive: true, force: true })
mkdirSync(releasesDir, { recursive: true })
mkdirSync(workDir, { recursive: true })

// Copy everything needed for a Next.js build to the work directory.
cpSync(join(here, 'src'), join(workDir, 'src'), { recursive: true })
cpSync(join(here, 'public'), join(workDir, 'public'), { recursive: true })
copyFileSync(join(here, 'next.config.mjs'), join(workDir, 'next.config.mjs'))
copyFileSync(join(here, 'package.json'), join(workDir, 'package.json'))

await buildRelease('v1', [])

applyOverlay('v2')
await buildRelease('v2', ['v1'])

applyOverlay('v3')
await buildRelease('v3', ['v2', 'v1'])

rmSync(workDir, { recursive: true, force: true })
writeFileSync(join(releasesDir, 'current.txt'), 'v1')

if (!quiet) console.log('\nReleases written to examples/nextjs/releases. Current release: v1')

function applyOverlay(version) {
  cpSync(
    join(here, 'release-overlays', version, 'app'),
    join(workDir, 'src', 'app'),
    { recursive: true },
  )
}

async function buildRelease(name, previousNames) {
  if (!quiet) console.log(`\nBuilding ${name}...`)

  // next.config.mjs reads NEXT_DIST_DIR to set distDir. Next.js resolves
  // distDir with path.join(projectDir, distDir), so we must pass a path
  // relative to workDir rather than an absolute path.
  const distDir = join(releasesDir, name, '.next')
  const relDistDir = relative(workDir, distDir)

  execFileSync(
    process.execPath,
    [next, 'build', '--webpack', workDir],
    {
      cwd: workDir,
      stdio: quiet ? 'ignore' : 'inherit',
      env: { ...process.env, NEXT_DIST_DIR: relDistDir },
    },
  )

  const chunksDir = join(distDir, 'static', 'chunks')
  const previous = previousNames.flatMap((n) => [
    '--previous', join(releasesDir, n, '.next', 'static', 'chunks'),
  ])

  execFileSync(
    process.execPath,
    [
      buildDeltas,
      '--preset', 'next-webpack',
      '--current', chunksDir,
      ...previous,
      '--public-path', '/_next/static/chunks',
      '--out', join(releasesDir, name, 'deltas'),
    ],
    { stdio: quiet ? 'ignore' : 'inherit' },
  )
}
