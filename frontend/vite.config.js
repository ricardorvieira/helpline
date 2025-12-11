import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
    allowedHosts: ['helpdesk-logger.preview.emergentagent.com', 'localhost', '127.0.0.1'],
    hmr: {
      port: 443,
      clientPort: 443,
      protocol: 'wss',
      host: 'helpdesk-logger.preview.emergentagent.com',
    },
  },
  build: {
    outDir: 'build',
  },
})
