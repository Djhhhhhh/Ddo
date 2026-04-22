import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import fs from 'node:fs'
import os from 'node:os'
import { resolve, join } from 'path'

function resolveDataRoot(): string {
  if (process.env.DDO_DATA_DIR) {
    return resolve(process.env.DDO_DATA_DIR)
  }

  return join(os.homedir(), '.ddo')
}

function resolveConfigPath(): string {
  if (process.env.DDO_WEB_UI_CONFIG) {
    return resolve(process.env.DDO_WEB_UI_CONFIG)
  }

  return join(resolveDataRoot(), 'web-ui', 'config.json')
}

function loadWebUiConfig(): { host: string; port: number; apiBaseUrl: string; healthPath: string } {
  const fallback = {
    host: '127.0.0.1',
    port: 50003,
    apiBaseUrl: process.env.DDO_SERVER_GO_URL || 'http://127.0.0.1:50001',
    healthPath: '/__ddo/health'
  }

  try {
    const configPath = resolveConfigPath()
    if (!fs.existsSync(configPath)) {
      return fallback
    }

    const parsed = JSON.parse(fs.readFileSync(configPath, 'utf8'))
    return {
      host: parsed.host || fallback.host,
      port: parsed.port || fallback.port,
      apiBaseUrl: parsed.apiBaseUrl || fallback.apiBaseUrl,
      healthPath: parsed.healthPath || fallback.healthPath
    }
  } catch {
    return fallback
  }
}

const runtimeConfig = loadWebUiConfig()

export default defineConfig({
  plugins: [
    vue(),
    {
      name: 'ddo-web-ui-health',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url === runtimeConfig.healthPath) {
            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ status: 'ok', service: 'web-ui' }))
            return
          }

          next()
        })
      }
    }
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  server: {
    host: runtimeConfig.host,
    port: runtimeConfig.port,
    strictPort: true,
    proxy: {
      '/api': {
        target: runtimeConfig.apiBaseUrl,
        changeOrigin: true
      },
      '/health': {
        target: runtimeConfig.apiBaseUrl,
        changeOrigin: true
      }
    }
  }
})