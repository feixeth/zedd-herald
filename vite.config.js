import { defineConfig, build } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve, dirname } from 'path'
import { copyFileSync, cpSync, mkdirSync, existsSync, renameSync } from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

function copyExtensionAssets(mode) {
  return {
    name: 'copy-extension-assets',
    async closeBundle() {
      const outDir = resolve(__dirname, `dist/${mode}`)
      mkdirSync(outDir, { recursive: true })

      // Build séparé du content script en IIFE (pas d'import externe)
      await build({
        configFile: false,
        build: {
          outDir,
          emptyOutDir: false,
          target: 'es2020',
          lib: {
            entry: resolve(__dirname, 'src/content/content-script.js'),
            name: 'PrivacyGuardContent',
            formats: ['iife'],
            fileName: () => 'content/content-script.js'
          },
          rollupOptions: {
            // On exclut le polyfill et on réimplémente sans lui
            external: ['webextension-polyfill']
          }
        }
      })
      console.log('✓ content-script.js → IIFE')

      // Copie manifest
      copyFileSync(
        resolve(__dirname, `manifest.${mode}.json`),
        resolve(outDir, 'manifest.json')
      )
      console.log(`✓ manifest.${mode}.json → dist/${mode}/manifest.json`)

      // Déplace le HTML de popup
      const htmlSrc = resolve(outDir, 'src/popup/index.html')
      const htmlDst = resolve(outDir, 'popup/index.html')
      if (existsSync(htmlSrc)) {
        mkdirSync(resolve(outDir, 'popup'), { recursive: true })
        renameSync(htmlSrc, htmlDst)
      }

      // Icônes
      const iconsDir = resolve(__dirname, 'icons')
      if (existsSync(iconsDir)) {
        cpSync(iconsDir, resolve(outDir, 'icons'), { recursive: true })
        console.log(`✓ icons/`)
      }
    }
  }
}

export default defineConfig(({ mode }) => ({
  plugins: [vue(), copyExtensionAssets(mode)],

  build: {
    outDir: `dist/${mode}`,
    emptyOutDir: true,
    target: 'es2020',
    rollupOptions: {
      input: {
        'background/service-worker': resolve(__dirname, 'src/background/service-worker.js'),
        'popup/index': resolve(__dirname, 'src/popup/index.html')
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: (a) => a.name?.endsWith('.css') ? 'popup/[name][extname]' : '[name][extname]'
      }
    }
  },

  define: { 'process.env.NODE_ENV': JSON.stringify('production') }
}))