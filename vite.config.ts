import { defineConfig } from 'vite';

// BASE_PATH is set in CI for the GitHub Pages subpath, for example "/game/". Default is the site root.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  build: { target: 'esnext' }, // top-level await
});
