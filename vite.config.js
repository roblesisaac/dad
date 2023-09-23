import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
// import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  build: {
    outDir: "./static",
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