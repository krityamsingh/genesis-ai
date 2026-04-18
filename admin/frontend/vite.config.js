// admin/frontend/vite.config.js
//
// FIX APPLIED:
//   • Proxy target corrected from port 8000 to 8080 to match PORT in .env.
//     With the wrong port, all /api/* requests during development returned
//     ECONNREFUSED, making login impossible even with the correct credentials.
// =============================================================================

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',   // FIX: was 8000, must match PORT in .env
        changeOrigin: true,
      },
    },
  },
})
