// Builds three releases of the Angular app using ng build with fileReplacements,
// then runs build-deltas for each release against the ones before it.
// The source tree is not modified; changes per release are declared in angular.json.

import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'

const here = dirname(fileURLToPath(import.meta.url))
const releasesDir = join(here, 'releases')
const buildDeltas = fileURLToPath(import.meta.resolve('@compression-dictionaries/core/build-deltas'))
const quiet = process.argv.includes('--quiet')

// Resolve the Angular CLI ng binary from the workspace node_modules.
const workspaceRoot = join(here, '..', '..')
const ng = join(workspaceRoot, 'node_modules', '@angular', 'cli', 'bin', 'ng.js')

rmSync(releasesDir, { recursive: true, force: true })
mkdirSync(releasesDir, { recursive: true })

// v1: standard production build
await buildRelease('v1', 'production', [])

// v2: production + v2 fileReplacements from angular.json
await buildRelease('v2', 'production,production-v2', ['v1'])

// v3: production + v3 fileReplacements from angular.json
await buildRelease('v3', 'production,production-v3', ['v2', 'v1'])

writeFileSync(join(releasesDir, 'current.txt'), 'v1')

if (!quiet) console.log('\nReleases written to examples/angular/releases. Current release: v1')

async function buildRelease(name, configuration, previousNames) {
  const outDir = join(releasesDir, name)
  const browserDir = join(outDir, 'browser')

  if (!quiet) console.log(`\nBuilding ${name} (--configuration=${configuration})...`)

  execFileSync(
    process.execPath,
    [ng, 'build', `--configuration=${configuration}`, `--output-path=${outDir}`],
    { cwd: here, stdio: quiet ? 'ignore' : 'inherit' },
  )

  const previous = previousNames.flatMap((n) => [
    '--previous', join(releasesDir, n, 'browser'),
  ])

  execFileSync(
    process.execPath,
    [
      buildDeltas,
      '--preset', 'angular',
      '--current', browserDir,
      ...previous,
      '--public-path', '/',
      '--out', join(outDir, 'deltas'),
    ],
    { stdio: quiet ? 'ignore' : 'inherit' },
  )
}
