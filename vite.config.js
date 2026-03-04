import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  build: {
    outDir: "./static",
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('vue') || id.includes('pinia')) {
              return 'vue-vendor'
            }
            if (id.includes('auth0')) {
              return 'auth'
            }
            if (id.includes('vuepic')) {
              return 'ui'
            }
            if (id.includes('swiper')) {
              return 'swiper'
            }
            if (id.includes('lucide')) {
              return 'icons'
            }
            if (id.includes('vuedraggable') || id.includes('sortablejs')) {
              return 'draggable'
            }
          }
        }
      }
    }
  },
  test: {
    include: '**/*.test.js',
  },
  plugins: [
    vue(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['icon.svg', 'logo.png'],
      manifest: {
        id: '/',
        name: 'TrackTabs',
        short_name: 'TrackTabs',
        description: 'TrackTabs dashboard and tab tracking app',
        theme_color: '#111827',
        background_color: '#111827',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      devOptions: {
        enabled: true,
      },
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    },
    extensions: ['.js', '.json', '.jsx', '.mjs', '.ts', '.tsx', '.vue']
  }
})
