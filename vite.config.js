import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    cors: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        rewrite: (path) => {
          console.log(path, path.replace(/^\/api/, ''))
          return path.replace(/^\/api/, '');
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
})
