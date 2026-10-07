import {defineConfig} from 'vite';

export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      // Rollup 4.64 stalls while tree-shaking the React 19 bundle. Keep this
      // pass disabled; esbuild still minifies the complete production bundle.
      treeshake: false,
      onwarn(warning, warn) {
        // A static application cannot load missing packages at runtime.
        if (warning.code === 'UNRESOLVED_IMPORT') {
          throw new Error(warning.message);
        }
        warn(warning);
      },
    },
  },
});
