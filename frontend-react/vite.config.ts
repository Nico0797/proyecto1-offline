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
  const apiProxyTarget = process.env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:5000';

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
          target: apiProxyTarget,
          changeOrigin: true,
          secure: false,
          timeout: 10000, // 10 second timeout
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, _res) => {
              console.log('Proxy error:', err.message);
              // Don't crash the dev server on proxy errors
            });
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              console.log('Proxying request:', req.method, req.url, '->', proxyReq.getHeader('host') + proxyReq.path);
            });
            proxy.on('proxyRes', (proxyRes, req, _res) => {
              console.log('Proxy response:', proxyRes.statusCode, req.url);
            });
            proxy.on('proxyReqWs', (proxyReq, req, socket, options, head) => {
              console.log('Proxying WebSocket request:', req.url);
            });
          },
        },
      },
    },
  }
})
