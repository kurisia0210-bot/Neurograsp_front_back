import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      // 确保 Fast Refresh 启用
      fastRefresh: true,
    })
  ],
  server: {
    host: '0.0.0.0', // 改为明确的 IP
    port: 5173,
    strictPort: false, // 端口被占用时自动尝试下一个
    watch: {
      usePolling: true, // Windows 文件系统需要轮询
      interval: 100
    },
    hmr: {
      overlay: true, // 显示错误覆盖层
      protocol: 'ws', // 明确使用 WebSocket
      host: 'localhost', // HMR 主机地址
      port: 5173,
    }
  },
  // 确保清除缓存
  optimizeDeps: {
    force: true
  }
})
