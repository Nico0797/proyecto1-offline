import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'fs'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig(() => {
  const HTTPS = (process.env.VITE_HTTPS || '').toLowerCase() === 'true';
  const KEY = process.env.VITE_HTTPS_KEY || '';
  const CERT = process.env.VITE_HTTPS_CERT || '';

  let https: any = false;
  if (HTTPS && KEY && CERT) {
    try {
      https = {
        key: fs.readFileSync(path.resolve(KEY)),
        cert: fs.readFileSync(path.resolve(CERT)),
      };
    } catch (e) {
      console.warn('Could not load HTTPS key/cert. Falling back to HTTP.', e);
      https = false;
    }
  }

  return {
    plugins: [react(), tailwindcss()],
    server: {
      host: true, // Listen on all addresses
      https,
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:8001',
          changeOrigin: true,
          secure: false,
        },
      },
    },
  }
})
