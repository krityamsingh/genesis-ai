import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = env.VITE_API_TARGET || 'http://localhost:8080'

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@components': path.resolve(__dirname, './src/components'),
        '@pages':      path.resolve(__dirname, './src/pages'),
        '@hooks':      path.resolve(__dirname, './src/hooks'),
        '@store':      path.resolve(__dirname, './src/store'),
        '@styles':     path.resolve(__dirname, './src/styles'),
        '@api':        path.resolve(__dirname, './src/api'),
      },
    },
    server: {
      port: 5173,
      host: '0.0.0.0',
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
          ws: true,
        },
        '/ws': {
          target: apiTarget.replace('http', 'ws'),
          ws: true,
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: mode !== 'production',
      rollupOptions: {
        output: {
          manualChunks: {
            vendor:  ['react', 'react-dom', 'react-router-dom'],
            state:   ['zustand'],
          },
        },
      },
      chunkSizeWarningLimit: 800,
    },
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '3.0.0'),
    },
  }
})
