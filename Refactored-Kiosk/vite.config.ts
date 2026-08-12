import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { host: true, port: 4173 },
  preview: { host: true, port: 4173 },
  test: { environment: 'jsdom', setupFiles: './src/test/setup.ts', css: true },
})
