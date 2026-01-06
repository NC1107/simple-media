import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    proxy: {
      '/api': {
        // Use localhost for local dev, backend for Docker
        target: process.env.VITE_API_URL || 'http://localhost:8101',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
  },
})