import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/deploy': 'http://localhost:3000',
      '/addLiquidity': 'http://localhost:3000',
      '/removeLiquidity': 'http://localhost:3000',
    },
  },
  build: {
    outDir: '../public',
    emptyOutDir: false,
  },
})
