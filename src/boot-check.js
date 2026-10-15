// Ana kod hiç çalışamazsa (ör. dosya okunamadıysa) boş ekran yerine uyarı göster.
setTimeout(function () {
  var v = document.getElementById('view');
  if (v && !v.childElementCount) {
    v.innerHTML = '<div style="padding:40px;color:#eef1f8;font-family:sans-serif"><h1>Program başlatılamadı</h1>' +
      '<p>Bu ekranın fotoğrafını Claude’a gönder. Ayrıca Ctrl+Shift+I ile açılan panelde Console sekmesindeki kırmızı yazıları da gönder.</p></div>';
  }
}, 7000);
