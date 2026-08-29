import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react(), tailwindcss()],
<<<<<<< Updated upstream
  server: { host: true, port: 8000 },
  preview: { host: true, port: 8000 },
  test: { environment: 'jsdom', setupFiles: './src/test/setup.ts', css: true },
=======
  server: {
    host: true,
    port: 4173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: true,
    port: 4173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  test: { environment: 'jsdom', setupFiles: './src/test/setup.ts', css: false },
>>>>>>> Stashed changes
})
