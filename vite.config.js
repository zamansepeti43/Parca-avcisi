import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        giris: 'giris.html',
        kayit: 'kayit.html',
        araclarim: 'araclarim.html',
        profilim: 'profilim.html',
        ilanlarim: 'ilanlarim.html',
        taleplerim: 'taleplerim.html',
        mesajlarim: 'mesajlarim.html',
        favorilerim: 'favorilerim.html',
        kayitliAramalarim: 'kayitli-aramalarim.html',
        bildirimler: 'bildirimler.html',
        musterilerim: 'musterilerim.html',
        hesapBilgileri: 'hesap-bilgileri.html',
        ayarlar: 'ayarlar.html',
        yardimDestek: 'yardim-destek.html',
        ilanVer: 'ilan-ver.html'
      }
    }
  }
});
