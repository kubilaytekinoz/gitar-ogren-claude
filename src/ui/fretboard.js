// Gitar sapı: sıradaki notanın nereye, hangi parmakla basılacağını gösterir.
import { FINGER_COLORS, FINGER_NAMES } from '../music/notes.js';

const NS = 'http://www.w3.org/2000/svg';
const W = 1000, H = 150;
const INLAYS = [3, 5, 7, 9, 15, 17, 19, 21];

export class Fretboard {
  constructor(container) {
    this.el = container;
    this.svg = document.createElementNS(NS, 'svg');
    this.svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    this.svg.setAttribute('preserveAspectRatio', 'none');
    container.appendChild(this.svg);
    this.fromFret = 0;
    this.toFret = 12;
    this._key = '';
  }

  _range(events) {
    const frets = events.flatMap((e) => e.notes.map((n) => n.fret)).filter((f) => f > 0);
    if (!frets.length) return [0, 12];
    const hi = Math.max(...frets), lo = Math.min(...frets);
    if (hi <= 12) return [0, 12];
    const from = Math.max(0, Math.min(lo - 1, hi - 12));
    return [from, from + 12];
  }

  /** @param next sıradaki vuruş, @param after ondan sonraki birkaç vuruş */
  show(next, after = []) {
    const key = (next ? next.id : 'x') + ':' + after.map((e) => e.id).join(',');
    if (key === this._key) return;
    this._key = key;
    const [from, to] = this._range([next, ...after].filter(Boolean));
    this.fromFret = from;
    this.toFret = to;
    const svg = this.svg;
    svg.textContent = '';

    const left = 54, right = W - 12, top = 18, bottom = H - 22;
    const n = to - from;
    const fx = (f) => left + ((f - from) / n) * (right - left); // perde teli konumu
    const mid = (f) => (f === 0 ? left - 22 : (fx(f - 1) + fx(f)) / 2); // perde ortası
    const sy = (s) => top + ((s - 1) / 5) * (bottom - top); // s=1 ince tel üstte

    const add = (tag, attrs, text) => {
      const e = document.createElementNS(NS, tag);
      for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
      if (text != null) e.textContent = text;
      svg.appendChild(e);
      return e;
    };

    add('rect', { x: left, y: top - 8, width: right - left, height: bottom - top + 16, rx: 6, fill: '#2a2018' });
    for (const f of INLAYS) {
      if (f <= from || f > to) continue;
      add('circle', { cx: mid(f), cy: (top + bottom) / 2, r: 6, fill: '#5b4a39' });
    }
    if (12 > from && 12 <= to) {
      add('circle', { cx: mid(12), cy: sy(2) + (sy(3) - sy(2)) / 2, r: 6, fill: '#5b4a39' });
      add('circle', { cx: mid(12), cy: sy(4) + (sy(5) - sy(4)) / 2, r: 6, fill: '#5b4a39' });
    }
    for (let f = from; f <= to; f++) {
      const isNut = f === 0;
      add('line', { x1: fx(f), y1: top - 8, x2: fx(f), y2: bottom + 8, stroke: isNut ? '#e9e2d0' : '#9c8f7a', 'stroke-width': isNut ? 6 : 2 });
      if (f > from) add('text', { x: mid(f), y: H - 4, 'text-anchor': 'middle', fill: '#6a7495', 'font-size': 12, 'font-family': 'Rubik' }, String(f));
    }
    for (let s = 1; s <= 6; s++) {
      add('line', { x1: left - 40, y1: sy(s), x2: right, y2: sy(s), stroke: '#c9c2b4', 'stroke-width': 0.8 + (s - 1) * 0.4 });
    }

    const dot = (note, ghost) => {
      const color = FINGER_COLORS[note.finger] ?? FINGER_COLORS[0];
      const x = mid(note.fret), y = sy(note.string);
      if (note.fret > 0 && (note.fret <= from || note.fret > to)) return;
      if (ghost) {
        add('circle', { cx: x, cy: y, r: 10, fill: 'none', stroke: color, 'stroke-width': 2, opacity: 0.55 });
        return;
      }
      if (note.fret === 0) {
        add('circle', { cx: x, cy: y, r: 11, fill: 'none', stroke: '#eef1f8', 'stroke-width': 3 });
        return;
      }
      add('circle', { cx: x, cy: y, r: 14, fill: color, stroke: '#0d1120', 'stroke-width': 2 });
      add('text', { x, y: y + 5, 'text-anchor': 'middle', fill: '#0d1120', 'font-size': 15, 'font-weight': 700, 'font-family': 'Rubik' }, String(note.finger));
    };
    for (const ev of after.slice(0, 2)) for (const nt of ev.notes) dot(nt, true);
    if (next) for (const nt of next.notes) dot(nt, false);
  }

  static legend() {
    return [1, 2, 3, 4]
      .map((f) => `<span class="row" style="gap:6px"><i style="width:12px;height:12px;border-radius:50%;background:${FINGER_COLORS[f]};display:inline-block"></i>${f} · ${FINGER_NAMES[f]}</span>`)
      .join('');
  }
}
