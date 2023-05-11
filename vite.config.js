import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
// import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  build: {
    outDir: "./static",
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