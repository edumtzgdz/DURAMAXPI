import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

import { cloudflare } from "@cloudflare/vite-plugin";

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [react(), cloudflare()],
  define: {
    global: 'window',
    'process.env': {},
  },
  resolve: {
    alias: {
      stream: path.resolve(__dirname, './src/utils/streamMock.ts'),
    },
  },
  server: {
    port: 3001,
  },
})