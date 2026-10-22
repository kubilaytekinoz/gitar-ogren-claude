// Şarkı kütüphanesi: hazır şarkılar + senin eklediğin Guitar Pro dosyaları.
import { getProgress, saveProgress } from '../lib/store.js';
import { h, esc, toast } from '../lib/dom.js';
import { LEVELS } from '../music/events.js';

function starHtml(n) {
  return `<span class="stars">${'★'.repeat(n)}<span class="off">${'★'.repeat(3 - n)}</span></span>`;
}

export function playSong(app, song) {
  const p = getProgress();
  const best = p.songBest[song.id];
  app.play({
    title: song.title,
    artist: song.artist,
    kind: 'song',
    songId: song.id,
    preferTrack: best?.track,
    source: { type: 'url', url: song.url, format: song.format },
    onMeta: (m) => {
      if (!song.builtIn && m.title && song.title !== m.title) {
        window.gitar.songs.setMeta(song.id, { title: m.title, artist: m.artist || '' });
      }
    },
    onResult: (r) => {
      const b = p.songBest[song.id] || { accuracy: 0, stars: 0, plays: 0 };
      b.plays = (b.plays || 0) + 1;
      if (r.accuracy > b.accuracy) b.accuracy = r.accuracy;
      if (r.stars > b.stars) b.stars = r.stars;
      if (r.level) { b.levels = b.levels || {}; b.levels[r.level] = Math.max(b.levels[r.level] || 0, r.accuracy); }
      b.lastPlayed = Date.now();
      p.songBest[song.id] = b;
      p.lastSong = song.id;
      saveProgress();
    },
  });
}

export function renderSongs(root, app) {
  const page = h(`
    <div class="page">
      <div class="page-head">
        <div>
          <h1>Şarkılar</h1>
          <p class="muted">Kendi Türkçe şarkılarını Guitar Pro dosyası olarak ekle. Program tabı okur, eşliği çalar, senin partini dinler.</p>
        </div>
      </div>
      <div class="drop" data-r="drop">
        <div style="font-size:2rem">⇣</div>
        <div style="flex:1">
          <h3>Dosyayı buraya sürükle</h3>
          <p class="muted small">Guitar Pro (.gp, .gp5, .gp4, .gp3, .gpx), MusicXML ve alphaTex. Songsterr veya Ultimate Guitar gibi sitelerden indirdiğin Guitar Pro dosyaları olur.</p>
        </div>
        <button class="btn primary" data-a="add">Dosya ekle</button>
      </div>
      <div class="song-list" data-r="list"><p class="muted">Yükleniyor…</p></div>
    </div>`);
  root.appendChild(page);
  const list = page.querySelector('[data-r="list"]');

  async function refresh(highlight = []) {
    const songs = await window.gitar.songs.list();
    const p = getProgress();
    if (!songs.length) {
      list.innerHTML = '<p class="muted">Henüz şarkı yok. Yukarıdan bir dosya ekle.</p>';
      return;
    }
    list.innerHTML = '';
    // Sıra: senin dosyaların, hazır şarkılar, sonra Riff & Solo paketi
    const groups = [
      ['Senin şarkıların', songs.filter((x) => !x.builtIn)],
      ['Hazır şarkılar', songs.filter((x) => x.builtIn && x.group !== 'riff')],
      ['Riff & Solo alıştırmaları', songs.filter((x) => x.group === 'riff')],
    ];
    for (const [label, items] of groups) {
      if (!items.length) continue;
      const head = h(`<h2 style="margin:26px 0 6px">${esc(label)}</h2>`);
      if (label.startsWith('Riff')) head.insertAdjacentHTML('beforeend', '<p class="muted small" style="font-weight:400;margin-top:4px">Kolaydan zora sıralı. Her biri kısa; Döngü ile tekrar tekrar çal, hızı yavaştan başlat.</p>');
      list.appendChild(head);
      for (const s of items) addRow(s, highlight);
    }
    return;
  }

  function addRow(s, highlight = []) {
    const p = getProgress();
    {
      const best = p.songBest[s.id];
      const row = h(`
        <div class="song" ${highlight.includes(s.id) ? 'style="background:var(--amber-soft)"' : ''}>
          <div>
            <div class="title">${esc(s.title)}</div>
            <div class="meta">${esc(s.artist || (s.builtIn ? '' : s.file))}</div>
          </div>
          <div>${s.builtIn ? '<span class="tag">Hazır</span>' : '<span class="tag mine">Senin dosyan</span>'}</div>
          <div class="small muted">${best ? `${starHtml(best.stars)}<br>en iyi %${best.accuracy}${best.levels ? '<br>' + Object.entries(best.levels).map(([k, v]) => `${LEVELS[k]?.label || k} %${v}`).join(' · ') : ''}` : 'henüz çalınmadı'}</div>
          <div class="row">
            ${s.builtIn ? '' : '<button class="btn icon ghost danger" data-a="del" title="Sil">🗑</button>'}
            <button class="btn primary" data-a="play">▶ Çal</button>
          </div>
        </div>`);
      row.querySelector('[data-a="play"]').onclick = () => playSong(app, s);
      const del = row.querySelector('[data-a="del"]');
      if (del) {
        del.onclick = async () => {
          if (!confirm(`"${s.title}" silinsin mi?`)) return;
          await window.gitar.songs.remove(s.id);
          delete p.songBest[s.id];
          saveProgress();
          refresh();
        };
      }
      list.appendChild(row);
    }
  }

  const added = (ids) => {
    if (ids.length) toast(`${ids.length} şarkı eklendi`);
    else toast('Bu dosya türü desteklenmiyor');
    refresh(ids);
  };
  page.querySelector('[data-a="add"]').onclick = async () => {
    const ids = await window.gitar.songs.import();
    if (ids.length) added(ids);
  };
  const drop = page.querySelector('[data-r="drop"]');
  const over = (e) => { e.preventDefault(); drop.classList.add('over'); };
  drop.addEventListener('dragover', over);
  drop.addEventListener('dragenter', over);
  drop.addEventListener('dragleave', () => drop.classList.remove('over'));
  drop.addEventListener('drop', async (e) => {
    e.preventDefault();
    drop.classList.remove('over');
    added(await window.gitar.songs.importFiles(e.dataTransfer.files));
  });
  refresh();
}
