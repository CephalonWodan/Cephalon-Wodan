import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Configuration prévue pour GitHub Pages sous /Cephalon-Wodan/loadout/
export default defineConfig({
  base: '/Cephalon-Wodan/loadout/',
  plugins: [react()],
  optimizeDeps: { exclude: ['lucide-react'] },
})
