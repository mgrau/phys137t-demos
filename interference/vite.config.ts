import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [svelte(), tailwindcss()],
  // Relative base so the built bundle works from a file:// path or from
  // anywhere under a Canvas files URL, not just a server root.
  base: './',
  build: { outDir: 'dist', emptyOutDir: true },
});
