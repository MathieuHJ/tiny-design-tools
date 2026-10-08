import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1]
const pagesBase = repositoryName?.endsWith('.github.io') ? '/' : `/${repositoryName}/`

export default defineConfig({
  base: repositoryName ? pagesBase : './',
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        gallery: resolve(import.meta.dirname, 'index.html'),
        cropProof: resolve(import.meta.dirname, 'crop-proof/index.html'),
        copyStress: resolve(import.meta.dirname, 'copy-stress/index.html'),
        squint: resolve(import.meta.dirname, 'squint/index.html'),
        concentric: resolve(import.meta.dirname, 'concentric/index.html'),
      },
    },
  },
  test: {
    environment: 'node',
    coverage: {
      reporter: ['text'],
    },
  },
})
