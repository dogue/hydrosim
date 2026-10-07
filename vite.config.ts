import {defineConfig} from 'vite';

export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
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
