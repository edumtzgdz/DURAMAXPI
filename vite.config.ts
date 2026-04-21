import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [react()],
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


// holaaaa!