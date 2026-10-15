# Gitar Öğren

Türkçe şarkılarla elektro gitar çalışma programı. Yousician gibi: eşlik çalar, sen gitarını çalarsın, program bastığın notayı dinleyip doğru mu yanlış mı gösterir.

## Kurulum (bir kere)

1. [Sürümler](https://github.com/kubilaytekinoz/gitar-ogren-claude/releases) sayfasından en yeni `GitarOgren-Kurulum-x.y.z.exe` dosyasını indir ve çalıştır.
2. Windows "Bilgisayarınız korundu" derse **Ek bilgi → Yine de çalıştır**'a bas (program imzasız olduğu için çıkar, bir kereliğine).

Bundan sonra program her açılışta kendini günceller. Yeni sürüm arka planda iner, kapatıp açınca kurulur.

## Gitarı bağlama

- Blackstar ID:Core'u arkadaki **USB** girişinden bilgisayara tak, gitarı amfiye tak.
- Programda **Ayarlar → Ses girişi** listesinden Blackstar'ı (ya da "USB Audio") seç.
- Bir tel çal: seviye çubuğu dolmalı, "Duyulan nota" yazmalı.
- Çaldığın an "geç" ya da "erken" diyorsa **Gecikme düzeltmesi** ile ayarla.

## Neler var

- **Şarkılar:** Guitar Pro (.gp, .gp5, .gp4, .gp3, .gpx), MusicXML ve alphaTex dosyalarını sürükle-bırak. Program tabı okur, istediğin gitar partisini seçersin; diğer enstrümanlar (bas, davul, vokal yerine melodi vb.) eşlik olarak çalar.
- **Akan nota şeridi:** her notada perde numarası; renk ve köşedeki rakam hangi parmakla basacağını gösterir (1 işaret, 2 orta, 3 yüzük, 4 serçe).
- **Gitar sapı:** sıradaki notanın sap üzerinde yeri.
- **Bekle modu:** doğru notaya basana kadar şarkı durur.
- **Hız:** %50'den %125'e. **Döngü:** tabda fareyle bölüm seç, tekrar tekrar çal. Sonuç ekranında zorlandığın ölçüye tıklayınca o kısım döngüye alınır.
- **Isınma:** her gün 3 egzersiz, başarına göre tempo kendiliğinden artar. Günlük seri takibi.
- **Akort aleti.**

## Geliştirme

```bash
npm install
npm run soundfont   # gerçekçi ses bankası (32 MB, bir kere)
npm start           # programı çalıştır
npm test            # nota algılama ve şarkı dosyası testleri
npm run songs       # hazır şarkıları yeniden üret
```

Yeni sürüm: `package.json` içindeki sürümü artır, `vX.Y.Z` etiketi gönder. GitHub Actions Windows kurulum dosyasını hazırlayıp Sürümler'e koyar; programlar kendini günceller.

## Lisanslar

- Nota görüntüleme ve ses motoru: [alphaTab](https://alphatab.net) (MPL-2.0)
- Enstrüman sesleri: GeneralUser GS — S. Christian Collins (bkz. `assets/soundfont/GeneralUser-GS-LICENSE.txt`)
- Yazı tipi: Rubik (SIL OFL)
