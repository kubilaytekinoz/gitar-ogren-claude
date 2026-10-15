// Akort aleti: standart akort (Mi La Re Sol Si Mi).
import { input } from '../audio/input.js';
import { freqToMidi } from '../audio/pitch.js';
import { noteName, STANDARD_TUNING } from '../music/notes.js';
import { h } from '../lib/dom.js';

const LABELS = [['E', 'Mi · 6'], ['A', 'La · 5'], ['D', 'Re · 4'], ['G', 'Sol · 3'], ['B', 'Si · 2'], ['e', 'Mi · 1']];

export function renderTuner(root) {
  const page = h(`
    <div class="page">
      <div class="page-head">
        <div>
          <h1>Akort</h1>
          <p class="muted">Bir teli tek başına çal ve sesini bırak. İbre ortada ve yeşilse o tel tamam.</p>
        </div>
      </div>
      <div class="panel tuner" data-r="tuner">
        <div class="note" data-r="note">–</div>
        <div class="solf" data-r="solf">${input.running ? 'Bir tel çal' : 'Gitar girişi kapalı · Ayarlar’dan aç'}</div>
        <div class="needle-wrap">
          <svg viewBox="0 0 600 120" width="100%">
            <rect x="270" y="20" width="60" height="70" rx="8" fill="rgba(46,196,182,.16)" />
            ${Array.from({ length: 21 }, (_, i) => {
              const x = 30 + i * 27;
              const big = i % 5 === 0;
              return `<line x1="${x}" x2="${x}" y1="${big ? 26 : 36}" y2="84" stroke="${i === 10 ? '#2ec4b6' : '#3a4566'}" stroke-width="${big ? 3 : 1.5}" />`;
            }).join('')}
            <text x="30" y="110" fill="#6a7495" font-size="14" text-anchor="middle" font-family="Rubik">−50</text>
            <text x="300" y="110" fill="#6a7495" font-size="14" text-anchor="middle" font-family="Rubik">0</text>
            <text x="570" y="110" fill="#6a7495" font-size="14" text-anchor="middle" font-family="Rubik">+50</text>
            <g data-r="needle" style="transition: transform .08s linear"><polygon points="300,12 292,0 308,0" fill="#f4b942" /><line x1="300" x2="300" y1="10" y2="92" stroke="#f4b942" stroke-width="4" stroke-linecap="round" /></g>
          </svg>
        </div>
        <div class="row muted" data-r="hint" style="min-height:1.4em"></div>
        <div class="strings">
          ${LABELS.map(([n, s], i) => `<div class="s" data-s="${i}">${n}<span>${s}</span></div>`).join('')}
        </div>
      </div>
    </div>`);
  root.appendChild(page);
  const $ = (r) => page.querySelector(`[data-r="${r}"]`);
  const tuned = new Set();
  const hist = [];
  let okSince = 0;
  let raf = 0;

  function frame() {
    const st = input.state;
    if (st.freq && st.clarity > 0.8) {
      hist.push(freqToMidi(st.freq));
      if (hist.length > 7) hist.shift();
    } else if (performance.now() - st.time > 300 || !st.freq) {
      hist.length = Math.max(0, hist.length - 1);
    }
    if (hist.length >= 3) {
      const m = [...hist].sort((a, b) => a - b)[hist.length >> 1];
      const nearest = Math.round(m);
      const cents = Math.round((m - nearest) * 100);
      const nn = noteName(nearest);
      $('note').innerHTML = `${nn.letter}<small>${nn.octave}</small>`;
      $('solf').textContent = nn.solfege;
      $('needle').style.transform = `translateX(${Math.max(-50, Math.min(50, cents)) * 5.4}px)`;
      // en yakın tel
      let si = 0, best = 99;
      STANDARD_TUNING.forEach((t, i) => { if (Math.abs(m - t) < best) { best = Math.abs(m - t); si = i; } });
      page.querySelectorAll('.s').forEach((el, i) => el.classList.toggle('near', i === si && best < 1.5));
      const ok = Math.abs(cents) <= 5 && nearest === STANDARD_TUNING[si];
      $('tuner').classList.toggle('ok', ok);
      if (best < 1.5) {
        const diff = (m - STANDARD_TUNING[si]) * 100;
        $('hint').textContent = ok ? 'Tamam!' : diff < 0 ? 'Biraz sık (ses ince olmalı)' : 'Biraz gevşet (ses kalın olmalı)';
        if (Math.abs(diff) > 60) $('hint').textContent = `${LABELS[si][0]} teline göre çok uzak, ${diff < 0 ? 'sık' : 'gevşet'}`;
      } else $('hint').textContent = '';
      if (ok) {
        okSince = okSince || performance.now();
        if (performance.now() - okSince > 600) {
          tuned.add(si);
          page.querySelector(`[data-s="${si}"]`).classList.add('tuned');
        }
      } else okSince = 0;
    }
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(raf);
}
