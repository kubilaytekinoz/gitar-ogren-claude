// Isınma sayfası ve ısınma oturumu (egzersizler arka arkaya).
import { WARMUPS, buildWarmupTex, nextTempo } from '../music/warmups.js';
import { todayRoutine, recordWarmup } from '../music/path.js';
import { getProgress, saveProgress, today } from '../lib/store.js';
import { h, esc, toast } from '../lib/dom.js';

/** list içindeki idx'inci egzersizi açar; bitince sıradakine geçer. */
export function startWarmup(app, list, idx, isRoutine) {
  const w = list[idx];
  const p = getProgress();
  const tempo = p.warmupTempo[w.id] ?? w.startTempo;
  const hasNext = idx + 1 < list.length;
  app.play({
    title: `${w.title} · ${tempo} BPM`,
    artist: w.desc,
    kind: 'warmup',
    source: { type: 'tex', tex: buildWarmupTex(w, tempo) },
    onResult: (r) => {
      const t = today();
      t.warmups[w.id] = Math.max(t.warmups[w.id] ?? 0, r.accuracy);
      recordWarmup(w.id, tempo, r.accuracy, r.speed);
      if (r.speed >= 1) {
        const nt = nextTempo(w, tempo, r.accuracy);
        if (nt !== tempo) toast(nt > tempo ? `Bir dahaki sefere ${nt} BPM` : `Tempo ${nt} BPM'e indi, acele yok`);
        p.warmupTempo[w.id] = nt;
      }
      saveProgress();
    },
    nextLabel: hasNext ? `Sıradaki: ${list[idx + 1].title}` : undefined,
    onNext: hasNext ? () => startWarmup(app, list, idx + 1, isRoutine) : undefined,
  });
}

export function renderWarmups(root, app) {
  const p = getProgress();
  const t = today();
  const routine = todayRoutine(t);
  const page = h(`
    <div class="page">
      <div class="page-head">
        <div>
          <h1>Isınma</h1>
          <p class="muted">Her gün üç kısa egzersiz. %90 ve üzeri yaptığında tempo bir sonraki sefer kendiliğinden artar, zorlanırsan düşer.</p>
        </div>
        <button class="btn primary" data-a="routine">Günün ısınmasını başlat</button>
      </div>
      <div class="warm-grid">
        ${WARMUPS.map((w) => {
          const tempo = p.warmupTempo[w.id] ?? w.startTempo;
          const inRoutine = routine.some((r) => r.id === w.id);
          const acc = t.warmups[w.id];
          const pct = Math.round(((tempo - w.startTempo) / (w.maxTempo - w.startTempo)) * 100);
          return `<div class="panel warm">
            <div class="focus">${esc(w.focus)}${inRoutine ? ' · bugün' : ''}</div>
            <h3>${esc(w.title)}</h3>
            <p class="muted small">${esc(w.desc)}</p>
            <div class="meter" title="Hedef tempoya ilerleme"><i style="width:${Math.max(4, pct)}%"></i></div>
            <div class="foot">
              <span class="tempo-pill">${tempo} / ${w.maxTempo} BPM${acc != null ? ` · bugün %${acc}` : ''}</span>
              <div class="spacer"></div>
              <button class="btn" data-w="${w.id}">Çal</button>
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>`);
  root.appendChild(page);
  page.querySelectorAll('[data-w]').forEach((b) => {
    b.onclick = () => startWarmup(app, WARMUPS, WARMUPS.findIndex((w) => w.id === b.dataset.w), false);
  });
  page.querySelector('[data-a="routine"]').onclick = () => {
    const first = routine.findIndex((w) => t.warmups[w.id] == null);
    startWarmup(app, routine, Math.max(0, first), true);
  };
}
