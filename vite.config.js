import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  // Relative base so the build also works from Capacitor's file-based webview.
  base: './',
  plugins: [vue()],
  worker: { format: 'es' },
})
