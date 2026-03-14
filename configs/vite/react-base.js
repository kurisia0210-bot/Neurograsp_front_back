import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * 共享的 Vite 基础配置
 * 每个应用可以扩展这个配置
 */
export function createViteConfig(options = {}) {
  const {
    port = 5173,
    host = '0.0.0.0',
    ...otherOptions
  } = options

  return defineConfig({
    plugins: [
      react({
        fastRefresh: true,
      })
    ],
    server: {
      host,
      port,
      strictPort: false,
      watch: {
        usePolling: true,
        interval: 100
      },
      hmr: {
        overlay: true,
        protocol: 'ws',
        host: 'localhost',
        port,
      }
    },
    optimizeDeps: {
      force: true
    },
    ...otherOptions
  })
}
