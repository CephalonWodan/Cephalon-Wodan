import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
// Set the base path for deployment. When deploying under a subfolder,
// GitHub Pages will serve the built assets from that folder. The base path can
// be overridden via the BASE_PATH environment variable in the CI workflow.
const base = process.env.BASE_PATH || '/loadout/';

export default defineConfig({
  base,
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
