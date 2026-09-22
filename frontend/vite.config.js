import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    host: true,
    proxy: {
      '/auth': 'http://127.0.0.1:8000',
      '/tags': 'http://127.0.0.1:8000',
      '/threads': 'http://127.0.0.1:8000',
      '/posts': 'http://127.0.0.1:8000',
      '/lastfm': 'http://127.0.0.1:8000',
      '/quilts': 'http://127.0.0.1:8000',
      '/curation': 'http://127.0.0.1:8000',
      '/static': 'http://127.0.0.1:8000',
      '/health': 'http://127.0.0.1:8000',
    },
  },
})
