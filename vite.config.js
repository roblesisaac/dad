import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
// import { VitePWA } from 'vite-plugin-pwa'

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
    // VitePWA({ 
    //   registerType: 'autoUpdate',
    //   devOptions: {
    //     enabled: true
    //   } 
    // })
  ],
})