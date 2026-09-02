import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        giris: 'giris.html',
        kayit: 'kayit.html',
        araclarim: 'araclarim.html'
      }
    }
  }
});
