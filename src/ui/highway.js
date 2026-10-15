// Akan nota şeridi: notalar sağdan gelir, sarı çizgiye geldiğinde çalınır.
// Her nota: perde numarası + hangi parmakla basılacağı (renk ve köşedeki rakam).
import { FINGER_COLORS, noteName } from '../music/notes.js';

const LANE_LABELS = ['e', 'B', 'G', 'D', 'A', 'E'];
const LANE_SOLF = ['Mi', 'Si', 'Sol', 'Re', 'La', 'Mi'];

export class Highway {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.events = [];
    this.bars = [];
    this.stringCount = 6;
    this.pxPerMs = 0.22;
    this.dpr = 1;
    this._ro = new ResizeObserver(() => this.resize());
    this._ro.observe(canvas.parentElement);
    this.resize();
  }

  destroy() {
    this._ro.disconnect();
  }

  setData({ events, bars, stringCount, tuning }) {
    this.events = events;
    this.bars = bars || [];
    this.stringCount = stringCount || 6;
    // tel isimleri akorttan: tel 1 = en ince
    if (tuning && tuning.length) {
      const high = [...tuning].reverse();
      this.labels = high.map((m, i) => {
        const n = noteName(m);
        const l = n.letter.replace('#', '♯');
        return { name: i === 0 && l === 'E' ? 'e' : l, solf: n.solfege };
      });
    } else this.labels = LANE_LABELS.map((name, i) => ({ name, solf: LANE_SOLF[i] }));
  }

  resize() {
    const r = this.canvas.parentElement.getBoundingClientRect();
    this.dpr = window.devicePixelRatio || 1;
    this.w = Math.max(200, r.width);
    this.h = Math.max(160, r.height);
    this.canvas.width = Math.round(this.w * this.dpr);
    this.canvas.height = Math.round(this.h * this.dpr);
  }

  _firstVisible(ms) {
    let lo = 0, hi = this.events.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (this.events[mid].endMs < ms) lo = mid + 1; else hi = mid;
    }
    return lo;
  }

  draw(nowMs, wallNow = performance.now()) {
    const { ctx, w, h, dpr } = this;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const gutter = 66;
    const top = 34, bottom = 18;
    const laneH = (h - top - bottom) / this.stringCount;
    const laneY = (s) => top + laneH * (s - 0.5); // s: 1 = ince tel (üstte)
    const hitX = gutter + Math.min(240, (w - gutter) * 0.2);
    const px = this.pxPerMs;
    const xOf = (ms) => hitX + (ms - nowMs) * px;
    const msLeft = nowMs - (hitX - gutter) / px;
    const msRight = nowMs + (w - hitX) / px;

    // arka plan: çalınmış bölge biraz koyu
    ctx.fillStyle = 'rgba(13,17,32,0.55)';
    ctx.fillRect(gutter, 0, hitX - gutter, h);

    // ölçü çizgileri
    ctx.font = '500 11px Rubik';
    ctx.textAlign = 'left';
    for (const b of this.bars) {
      if (b.ms < msLeft - 2000 || b.ms > msRight) continue;
      const x = xOf(b.ms);
      if (x < gutter) continue;
      ctx.strokeStyle = 'rgba(152,162,192,0.18)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, top - 6);
      ctx.lineTo(x, h - bottom + 6);
      ctx.stroke();
      ctx.fillStyle = 'rgba(152,162,192,0.6)';
      ctx.fillText(String(b.number), x + 4, 16);
    }

    // teller: kalın teller daha kalın çizilir
    for (let s = 1; s <= this.stringCount; s++) {
      const y = laneY(s);
      ctx.strokeStyle = '#3a4566';
      ctx.lineWidth = 0.8 + (s - 1) * 0.45;
      ctx.beginPath();
      ctx.moveTo(gutter, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // vuruş çizgisi
    const grad = ctx.createLinearGradient(hitX - 14, 0, hitX + 14, 0);
    grad.addColorStop(0, 'rgba(244,185,66,0)');
    grad.addColorStop(0.5, 'rgba(244,185,66,0.22)');
    grad.addColorStop(1, 'rgba(244,185,66,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(hitX - 14, top - 10, 28, h - top - bottom + 20);
    ctx.strokeStyle = '#f4b942';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(hitX, top - 10);
    ctx.lineTo(hitX, h - bottom + 10);
    ctx.stroke();

    // notalar (sol kenardaki tel isimlerinin üstüne taşmasın)
    ctx.save();
    ctx.beginPath();
    ctx.rect(gutter, 0, w - gutter, h);
    ctx.clip();
    const r = Math.min(19, laneH * 0.4);
    const start = this._firstVisible(msLeft);
    for (let i = start; i < this.events.length; i++) {
      const ev = this.events[i];
      if (ev.ms > msRight) break;
      const x = xOf(ev.ms);
      const xe = Math.max(x, xOf(ev.endMs) - 6);
      const past = ev.ms < nowMs - 30;
      let alpha = 1;
      if (ev.state === 'miss') alpha = 0.5;
      else if (past && ev.state !== 'hit') alpha = 0.7;
      ctx.globalAlpha = alpha;

      // akor bağlantı çizgisi
      if (ev.notes.length > 1) {
        const ys = ev.notes.map((n) => laneY(n.string));
        ctx.strokeStyle = ev.state === 'hit' ? '#2ec4b6' : 'rgba(238,241,248,0.55)';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x, Math.min(...ys));
        ctx.lineTo(x, Math.max(...ys));
        ctx.stroke();
        if (ev.shape === 'power' || ev.notes.length >= 3) {
          const label = chordLabel(ev);
          if (label) {
            ctx.font = '600 13px Rubik';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#eef1f8';
            ctx.fillText(label, x, Math.min(...ys) - r - 6);
          }
        }
      }

      for (const n of ev.notes) {
        const y = laneY(n.string);
        const color = FINGER_COLORS[n.finger] ?? FINGER_COLORS[0];
        // uzun nota kuyruğu
        if (xe - x > r) {
          ctx.fillStyle = hexA(color, ev.state === 'hit' ? 0.45 : 0.28);
          roundRect(ctx, x, y - 5, xe - x, 10, 5);
          ctx.fill();
        }
        // nota
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        if (ev.state === 'hit') {
          ctx.fillStyle = '#2ec4b6';
        } else if (ev.state === 'miss') {
          ctx.fillStyle = '#3a2232';
        } else {
          ctx.fillStyle = color;
        }
        ctx.fill();
        if (ev.state === 'miss') {
          ctx.strokeStyle = '#ff6b5a';
          ctx.lineWidth = 2.5;
          ctx.stroke();
        }
        ctx.fillStyle = ev.state === 'miss' ? '#ff6b5a' : '#0d1120';
        ctx.font = `700 ${Math.round(r * 0.95)}px Rubik`;
        ctx.textAlign = 'center';
        ctx.fillText(String(n.fret), x, y + r * 0.34);
        // parmak rozeti
        if (n.finger > 0 && ev.state !== 'miss') {
          const bx = x + r * 0.78, by = y - r * 0.78;
          ctx.beginPath();
          ctx.arc(bx, by, r * 0.42, 0, Math.PI * 2);
          ctx.fillStyle = '#0d1120';
          ctx.fill();
          ctx.strokeStyle = color;
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.fillStyle = color;
          ctx.font = `600 ${Math.round(r * 0.5)}px Rubik`;
          ctx.fillText(String(n.finger), bx, by + r * 0.18);
        }
        // isabet halkası
        if (ev.state === 'hit' && ev.hitAt) {
          const t = (wallNow - ev.hitAt) / 380;
          if (t < 1) {
            ctx.beginPath();
            ctx.arc(x, y, r + t * 16, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(46,196,182,${1 - t})`;
            ctx.lineWidth = 3;
            ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = 1;
    }

    // sol kenar: şerit soldan kaybolurken yumuşak geçiş
    const fade = ctx.createLinearGradient(gutter, 0, gutter + 50, 0);
    fade.addColorStop(0, '#121729');
    fade.addColorStop(1, 'rgba(18,23,41,0)');
    ctx.fillStyle = fade;
    ctx.fillRect(gutter, 0, 50, h);
    ctx.restore();

    // tel isimleri
    ctx.fillStyle = '#121729';
    ctx.fillRect(0, 0, gutter, h);
    for (let s = 1; s <= this.stringCount; s++) {
      const y = laneY(s);
      ctx.fillStyle = '#eef1f8';
      ctx.font = '600 16px Rubik';
      ctx.textAlign = 'right';
      ctx.fillText(this.labels?.[s - 1]?.name ?? LANE_LABELS[s - 1] ?? String(s), gutter - 30, y + 5);
      ctx.fillStyle = '#6a7495';
      ctx.font = '400 11px Rubik';
      ctx.textAlign = 'left';
      ctx.fillText(this.labels?.[s - 1]?.solf ?? '', gutter - 26, y + 4);
    }
  }
}

function chordLabel(ev) {
  const sorted = [...ev.notes].sort((a, b) => a.midi - b.midi);
  const root = sorted[0];
  const n = noteName(root.midi);
  const pcs = new Set(sorted.map((x) => (x.midi - root.midi) % 12));
  if (ev.shape === 'power' || (pcs.size === 2 && pcs.has(7))) return `${n.letter}5`;
  if (pcs.has(4) && pcs.has(7)) return n.letter;
  if (pcs.has(3) && pcs.has(7)) return `${n.letter}m`;
  return '';
}

function hexA(hex, a) {
  const v = parseInt(hex.slice(1), 16);
  return `rgba(${(v >> 16) & 255},${(v >> 8) & 255},${v & 255},${a})`;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
