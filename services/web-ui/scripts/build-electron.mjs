import * as esbuild from 'esbuild'
import { copyFileSync, mkdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = join(__dirname, '..')
const electronSrcDir = join(rootDir, 'electron')
const electronOutDir = join(rootDir, 'dist-electron')

// Build options for each entry point
const builds = [
  {
    entryPoints: [join(electronSrcDir, 'main.ts')],
    outfile: join(electronOutDir, 'main.js'),
    platform: 'node',
    target: 'node18',
    format: 'esm',
    bundle: true,
    external: ['electron', 'electron-store', 'electron-log']
  },
  {
    entryPoints: [join(electronSrcDir, 'preload.ts')],
    outfile: join(electronOutDir, 'preload.js'),
    platform: 'node',
    target: 'node18',
    format: 'cjs',
    bundle: true,
    external: ['electron']
  },
  {
    entryPoints: [join(electronSrcDir, 'ipc.ts')],
    outfile: join(electronOutDir, 'ipc.js'),
    platform: 'node',
    target: 'node18',
    format: 'esm',
    bundle: true,
    external: ['electron']
  },
  {
    entryPoints: [join(electronSrcDir, 'tray.ts')],
    outfile: join(electronOutDir, 'tray.js'),
    platform: 'node',
    target: 'node18',
    format: 'esm',
    bundle: true,
    external: ['electron']
  },
  {
    entryPoints: [join(electronSrcDir, 'notification.ts')],
    outfile: join(electronOutDir, 'notification.js'),
    platform: 'node',
    target: 'node18',
    format: 'esm',
    bundle: true,
    external: ['electron']
  },
  {
    entryPoints: [join(electronSrcDir, 'store.ts')],
    outfile: join(electronOutDir, 'store.js'),
    platform: 'node',
    target: 'node18',
    format: 'esm',
    bundle: true,
    external: ['electron', 'electron-store']
  },
  {
    entryPoints: [join(electronSrcDir, 'windows/mainWindow.ts')],
    outfile: join(electronOutDir, 'windows/mainWindow.js'),
    platform: 'node',
    target: 'node18',
    format: 'esm',
    bundle: true,
    external: ['electron']
  },
  {
    entryPoints: [join(electronSrcDir, 'windows/islandWindow.ts')],
    outfile: join(electronOutDir, 'windows/islandWindow.js'),
    platform: 'node',
    target: 'node18',
    format: 'esm',
    bundle: true,
    external: ['electron']
  }
]

async function build() {
  console.log('[Build] Building Electron TypeScript files...')

  // Create output directory
  if (!existsSync(electronOutDir)) {
    mkdirSync(electronOutDir, { recursive: true })
  }
  if (!existsSync(join(electronOutDir, 'windows'))) {
    mkdirSync(join(electronOutDir, 'windows'), { recursive: true })
  }

  // Build all entry points
  const results = await Promise.all(
    builds.map(opts =>
      esbuild.build(opts).catch(err => {
        console.error(`[Build Error] ${opts.outfile}:`, err)
        return null
      })
    )
  )

  const success = results.every(r => r !== null)
  if (success) {
    console.log('[Build] Electron build completed successfully!')
  } else {
    console.error('[Build] Electron build failed!')
    process.exit(1)
  }
}

build()
