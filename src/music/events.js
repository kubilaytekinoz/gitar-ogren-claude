// alphaTab'in nota modelinden, çalma ekranının kullandığı "olay" listesini çıkarır.
// Her olay: bir vuruş (tek nota veya akor), başlangıç/bitiş zamanı, tel/perde,
// hangi parmakla basılacağı.

export const TICKS_PER_QUARTER = 960;

/**
 * Tik → milisaniye dönüşümü için tempo haritası (tekrarlar dahil çalınış sırasıyla).
 * @param {any} tickCache alphaTab MidiTickLookup
 */
export function buildTempoMap(tickCache) {
  const points = []; // {tick, tempo, ms}
  for (const mb of tickCache.masterBars) {
    for (const tc of mb.tempoChanges) {
      if (points.length && points[points.length - 1].tick === tc.tick) {
        points[points.length - 1].tempo = tc.tempo;
      } else points.push({ tick: tc.tick, tempo: tc.tempo, ms: 0 });
    }
  }
  if (!points.length) points.push({ tick: 0, tempo: 120, ms: 0 });
  if (points[0].tick > 0) points.unshift({ tick: 0, tempo: points[0].tempo, ms: 0 });
  for (let i = 1; i < points.length; i++) {
    const p = points[i - 1];
    points[i].ms = p.ms + ((points[i].tick - p.tick) * 60000) / (p.tempo * TICKS_PER_QUARTER);
  }
  const find = (tick) => {
    let lo = 0, hi = points.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (points[mid].tick <= tick) lo = mid; else hi = mid - 1;
    }
    return points[lo];
  };
  return {
    points,
    tickToMs(tick) {
      const p = find(tick);
      return p.ms + ((tick - p.tick) * 60000) / (p.tempo * TICKS_PER_QUARTER);
    },
    tempoAt(tick) {
      return find(tick).tempo;
    },
  };
}

function isPowerChordShape(notes) {
  // tel numarası 1 = ince e. Kök en kalın telde, beşli bir ince telde iki perde yukarıda.
  if (notes.length < 2 || notes.length > 3) return false;
  const s = [...notes].sort((a, b) => b.string - a.string);
  const root = s[0];
  if (root.fret === 0 && notes.length === 2) return false;
  return s[1].string === root.string - 1 && s[1].midi - root.midi === 7 &&
    (s.length === 2 || (s[2].string === root.string - 2 && s[2].midi - root.midi === 12));
}

/**
 * Parmak numaralarını belirler. Dosyada parmak bilgisi varsa onu kullanır,
 * yoksa "her perdeye bir parmak" kuralıyla el pozisyonu takip edilerek atanır.
 */
export function assignFingers(events) {
  let pos = 1; // işaret parmağının durduğu perde
  const fits = (ev, p) => ev.notes.every((n) => n.fret === 0 || (n.fret >= p && n.fret <= p + 3));
  // p pozisyonunda, ileride kaç vuruşun el kaydırmadan çalınabileceği
  const lookahead = (i, p) => {
    let c = 0;
    for (let j = i; j < Math.min(events.length, i + 10); j++) {
      if (!fits(events[j], p)) break;
      c++;
    }
    return c;
  };
  for (let i = 0; i < events.length; i++) {
    const ev = events[i];
    const fretted = ev.notes.filter((n) => n.fret > 0);
    for (const n of ev.notes) if (n.fret === 0) n.finger = 0;
    if (!fretted.length) continue;
    if (fretted.every((n) => n.fileFinger >= 1)) {
      for (const n of fretted) n.finger = n.fileFinger;
      const n0 = fretted[0];
      pos = Math.max(1, n0.fret - n0.fileFinger + 1);
      continue;
    }
    if (isPowerChordShape(ev.notes)) {
      const s = [...ev.notes].sort((a, b) => b.string - a.string);
      s[0].finger = s[0].fret === 0 ? 0 : 1;
      if (s[1]) s[1].finger = s[0].fret === 0 ? 2 : 3;
      if (s[2]) s[2].finger = s[0].fret === 0 ? 3 : 4;
      pos = Math.max(1, s[0].fret || 1);
      ev.shape = 'power';
      continue;
    }
    const lo = Math.min(...fretted.map((n) => n.fret));
    const hi = Math.max(...fretted.map((n) => n.fret));
    if (hi - lo > 3) {
      pos = lo;
    } else {
      // ileriyi de düşünerek eli en az kaydıracak pozisyonu seç
      let best = pos, bestScore = -1;
      for (let p = Math.max(1, hi - 3); p <= lo; p++) {
        const sc = lookahead(i, p) + (p === pos ? 1 : 0);
        if (sc > bestScore || (sc === bestScore && Math.abs(p - pos) < Math.abs(best - pos))) {
          best = p; bestScore = sc;
        }
      }
      pos = best;
    }
    for (const n of fretted) n.finger = Math.max(1, Math.min(4, n.fret - pos + 1));
    ev.position = pos;
  }
  return events;
}

/**
 * @param {any} score alphaTab Score
 * @param {number} trackIndex
 * @param {any} tickCache alphaTab MidiTickLookup (api.tickCache)
 */
export function extractEvents(score, trackIndex, tickCache) {
  const track = score.tracks[trackIndex];
  const staff = track.staves.find((s) => !s.isPercussion && s.tuning && s.tuning.length) || track.staves[0];
  const stringCount = staff.tuning.length || 6;
  const tempo = buildTempoMap(tickCache);
  const events = [];
  let id = 0;
  for (const mb of tickCache.masterBars) {
    const barIndex = mb.masterBar.index;
    const bar = staff.bars[barIndex];
    if (!bar) continue;
    for (const voice of bar.voices) {
      for (const beat of voice.beats) {
        if (beat.isRest) continue;
        const notes = [];
        for (const n of beat.notes) {
          if (n.isTieDestination || n.isDead || n.isGhost) continue;
          if (n.fret < 0 || n.string < 1) continue;
          notes.push({
            string: stringCount - n.string + 1, // 1 = ince Mi (e)
            fret: n.fret,
            midi: n.stringTuning + n.fret,
            fileFinger: n.leftHandFinger >= 1 ? n.leftHandFinger : -1,
            finger: -1,
          });
        }
        if (!notes.length) continue;
        const tick = mb.start + beat.playbackStart;
        const endTick = tick + Math.max(1, beat.playbackDuration);
        events.push({
          id: id++,
          tick,
          endTick,
          ms: tempo.tickToMs(tick),
          endMs: tempo.tickToMs(endTick),
          barIndex,
          notes: notes.sort((a, b) => b.string - a.string),
          isChord: notes.length > 1,
          state: 'pending',
        });
      }
    }
  }
  events.sort((a, b) => a.tick - b.tick || a.id - b.id);
  // aynı ana denk gelen (çoklu ses) vuruşları birleştir
  const merged = [];
  for (const ev of events) {
    const last = merged[merged.length - 1];
    if (last && last.tick === ev.tick) {
      for (const n of ev.notes) if (!last.notes.some((x) => x.string === n.string)) last.notes.push(n);
      last.isChord = last.notes.length > 1;
      last.endTick = Math.max(last.endTick, ev.endTick);
      last.endMs = Math.max(last.endMs, ev.endMs);
    } else merged.push(ev);
  }
  merged.forEach((e, i) => (e.id = i));
  assignFingers(merged);
  return { events: merged, tempo, stringCount, tuning: [...staff.tuning].reverse() /* kalından inceye */ };
}

/** Bir parçada gitar olarak çalınabilir izleri listeler. */
export function playableTracks(score) {
  const list = [];
  score.tracks.forEach((t, i) => {
    const prog = t.playbackInfo.program;
    const stringed = prog >= 24 && prog <= 39; // GM: gitarlar ve baslar
    const st = t.staves.find((s) => !s.isPercussion && s.tuning && s.tuning.length >= 4 && (s.showTablature || stringed));
    if (!st) return;
    let noteCount = 0;
    for (const bar of st.bars) for (const v of bar.voices) for (const b of v.beats) noteCount += b.notes.length;
    if (!noteCount) return;
    list.push({ index: i, name: t.name || `İz ${i + 1}`, strings: st.tuning.length, program: prog, isGuitar: prog >= 24 && prog <= 31, noteCount });
  });
  return list;
}

/** Aynı dosyadan 4 seviye. Alıştırma ve Kolay'da notalar seyreltilir, akorlar sadeleşir. */
export const LEVELS = {
  alistirma: { label: 'Alıştırma', speed: 0.75, window: 2, maxNotes: 1, hint: 'Her iki vuruşta bir nota, akorların sadece kalın teli' },
  kolay: { label: 'Kolay', speed: 0.9, window: 1, maxNotes: 2, hint: 'Her vuruşta bir nota, akorlar 2 telli' },
  zor: { label: 'Zor', speed: 1, window: 0, maxNotes: 99, hint: 'Bütün notalar' },
  sahne: { label: 'Sahne', speed: 1, window: 0, maxNotes: 99, hint: 'Bütün notalar, tam hız, beklemeden, sıkı zamanlama' },
};

export function simplifyEvents(events, level) {
  const L = LEVELS[level] || LEVELS.zor;
  if (!L.window) return events;
  const W = L.window * TICKS_PER_QUARTER;
  const out = [];
  let lastWin = -1;
  for (const ev of events) {
    const win = Math.floor(ev.tick / W);
    if (win === lastWin) continue;
    lastWin = win;
    // notes: kalın telden inceye sıralı; en kalın N nota kalır
    const notes = ev.notes.slice(0, L.maxNotes);
    out.push({ ...ev, notes, isChord: notes.length > 1, state: 'pending' });
  }
  // çok seyrek kaldıysa (ör. çok yavaş şarkı) bir alt pencereyle yeniden dene
  if (out.length < events.length * 0.25 && L.window > 1) return simplifyEvents(events, 'kolay');
  return out;
}
