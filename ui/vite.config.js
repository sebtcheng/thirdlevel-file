import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { devLogSink } from './src/devtools/vite-plugin-dev-log-sink'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const rootDir = path.resolve(__dirname, '..')
  const env = loadEnv(mode, rootDir, '')
  const apiTarget = normalizeApiBaseUrl(process.env.API_PROXY_TARGET || env.VITE_API_URL)
  const base = env.VITE_BASE_PATH || '/'

  return {
    plugins: [react(), devLogSink()],
    envDir: rootDir,
    base,
    server: {
      port: Number(process.env.VITE_PORT) || 5173,
      strictPort: true,
      proxy: apiTarget ? {
        '/insighted-third-level-officials/api': {
          target: apiTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/insighted-third-level-officials/, '')
        },
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        }
      } : undefined
    }
  }
})

function normalizeApiBaseUrl(value) {
  const trimmedValue = (value || '').trim().replace(/\/$/, '')

  if (!trimmedValue) return ''
  if (/^https?:\/\//i.test(trimmedValue)) return trimmedValue
  if (/^(localhost|127\.0\.0\.1)(:\d+)?/i.test(trimmedValue)) {
    return `http://${trimmedValue}`
  }

  return trimmedValue
}
