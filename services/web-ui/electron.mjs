#!/usr/bin/env node

/**
 * Ddo Ding - Electron 入口脚本
 * 用于编译和启动 Electron 应用
 */

import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { existsSync } from 'node:fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

// 编译 Electron TypeScript
async function buildElectron() {
  console.log('[Ddo Ding] 编译 Electron 代码...')

  // 使用 esbuild 或 tsc 编译
  try {
    const { execSync } = await import('node:child_process')

    // 确保 dist 目录存在
    const { mkdirSync, existsSync } = await import('node:fs')
    const distDir = path.join(rootDir, 'dist-electron')
    if (!existsSync(distDir)) {
      mkdirSync(distDir, { recursive: true })
    }

    // 复制源文件到 dist-electron（简化处理，实际应该用 tsc 或 esbuild）
    const { copyFileSync, readdirSync, mkdirSync } = await import('node:fs')
    const { join } = await import('node:path')

    function copyDir(src, dest) {
      if (!existsSync(dest)) {
        mkdirSync(dest, { recursive: true })
      }
      const entries = readdirSync(src, { withFileTypes: true })
      for (const entry of entries) {
        const srcPath = path.join(src, entry.name)
        const destPath = path.join(dest, entry.name)
        if (entry.isDirectory()) {
          copyDir(srcPath, destPath)
        } else {
          copyFileSync(srcPath, destPath)
        }
      }
    }

    copyDir(path.join(rootDir, 'electron'), distDir)
    console.log('[Ddo Ding] Electron 代码编译完成')
  } catch (error) {
    console.error('[Ddo Ding] 编译失败:', error)
    process.exit(1)
  }
}

// 启动 Electron
function startElectron() {
  console.log('[Ddo Ding] 启动 Electron...')

  const electronPath = path.join(rootDir, 'node_modules', '.bin', 'electron')
  const mainPath = path.join(rootDir, 'dist-electron', 'main.js')

  if (!existsSync(electronPath)) {
    console.error('[Ddo Ding] 未找到 electron，请先运行 npm install')
    process.exit(1)
  }

  if (!existsSync(mainPath)) {
    console.error('[Ddo Ding] 未找到编译后的 main.js，请先运行 build')
    process.exit(1)
  }

  const electron = spawn(electronPath, [mainPath], {
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'development',
      VITE_DEV_SERVER_URL: 'http://localhost:3000'
    }
  })

  electron.on('close', (code) => {
    process.exit(code || 0)
  })
}

// 主函数
async function main() {
  const args = process.argv.slice(2)

  if (args.includes('--build')) {
    await buildElectron()
  } else if (args.includes('--help')) {
    console.log(`
Ddo Ding - Electron 启动脚本

用法:
  node electron.mjs [选项]

选项:
  --build    仅编译，不启动
  --help     显示帮助信息

示例:
  node electron.mjs          # 编译并启动
  node electron.mjs --build  # 仅编译
    `)
  } else {
    await buildElectron()
    startElectron()
  }
}

main().catch(console.error)