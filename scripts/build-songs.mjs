// Hazır gelen şarkıları alphaTex formatında üretir: node scripts/build-songs.mjs
// Her şarkıda: senin çalacağın gitar partisi + eşlik (bas, ritim gitarı, perküsyon / davul, yaylılar).
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'songs');
mkdirSync(outDir, { recursive: true });

const q = (s) => `"${s.replace(/"/g, '\\"')}"`;

// Gitar akor şekilleri (alphaTex: perde.tel, tel 1 = ince Mi)
const GTR = {
  C: '(0.1 1.2 0.3 2.4 3.5)',
  G7: '(1.1 0.2 0.3 0.4 2.5 3.6)',
  A: '(0.1 2.2 2.3 2.4 0.5)',
  Dm: '(1.1 3.2 2.3 0.4)',
  Gm: '(3.1 3.2 3.3 5.4 5.5 3.6)',
  E5: '(0.6 2.5 2.4)',
  G5: '(3.6 5.5 5.4)',
  A5: '(0.5 2.4 2.3)',
  C5: '(3.5 5.4 5.3)',
  D5: '(5.5 7.4 7.3)',
};
// Bas kökleri (4 telli bas; tel 1 = Sol, 4 = Mi)
const BASS = {
  C: '3.3', G7: '3.4', G: '3.4', A: '0.3', Dm: '0.2', D: '0.2', Gm: '3.4', E: '0.4', F: '1.4',
  E5: '0.4', G5: '3.4', A5: '0.3', C5: '3.3', D5: '0.2',
};
const BASS5 = { C: '0.1', G7: '0.2', G: '0.2', A: '2.2', Dm: '2.1', Gm: '0.2', E5: '2.3', G5: '0.2', A5: '2.2', C5: '0.1', D5: '2.1' };
// Yaylılar için akor sesleri
const PAD = {
  C: '(c3 e3 g3)', G7: '(b2 d3 f3 g3)', A: '(a2 c#3 e3)', Dm: '(a2 d3 f3)', Gm: '(g2 bb2 d3)',
};

function song({ file, title, artist, tempo, ts = [4, 4], melody, chords, repeat = 1, accomp, drum, pad }) {
  const bars = melody.length;
  const wrap = (arr) => arr.map((b, i) => {
    let pre = '';
    if (i === 0) pre += `\\ts (${ts[0]} ${ts[1]}) `;
    if (repeat > 1 && i === 0) pre += '\\ro ';
    if (repeat > 1 && i === bars - 1) pre += `\\rc ${repeat} `;
    return pre + b;
  }).join(' |\n  ');

  let tex = `\\title ${q(title)}\n\\artist ${q(artist)}\n\\tempo ${tempo}\n.\n`;
  tex += `\\track "Senin Partin" { instrument electricguitarclean volume 13 }\n  \\staff {score tabs}\n  \\tuning E4 B3 G3 D3 A2 E2\n  ${wrap(melody)}\n`;

  // "G5/A5" gibi yazılan ölçü: yarısı bir akor, yarısı diğeri
  const halves = (c) => c.split('/');
  const gtrBars = chords.map((c) => {
    const h = halves(c);
    if (h.length === 1) return accomp(c);
    return h.map((x) => `:4 ${GTR[x]} ${GTR[x]}`).join(' ');
  });
  tex += `\\track "Ritim Gitarı" { instrument acousticguitarsteel volume 10 }\n  \\staff {tabs}\n  \\tuning E4 B3 G3 D3 A2 E2\n  ${wrap(gtrBars)}\n`;

  const bassBars = chords.map((c) => {
    const h = halves(c);
    if (h.length > 1) return ':4 ' + h.map((x) => `${BASS[x]} ${BASS[x]}`).join(' ');
    const r = BASS[c], f = BASS5[c] ?? r;
    return ts[0] === 4 ? `:4 ${r} ${f} ${r} ${f}` : `:4 ${r} ${f} ${f}`;
  });
  tex += `\\track "Bas" { instrument electricbassfinger volume 12 }\n  \\staff {tabs}\n  \\tuning G2 D2 A1 E1\n  ${wrap(bassBars)}\n`;

  if (pad) {
    const padBars = chords.map((c) => halves(c).length > 1 ? halves(c).map((x) => `${PAD[x]}.2`).join(' ') : `${PAD[c]}.1`);
    tex += `\\track "Yaylılar" { instrument stringensemble1 volume 7 }\n  \\staff {score}\n  \\tuning piano\n  ${wrap(padBars)}\n`;
  }
  if (drum) {
    tex += `\\track ${q(drum.name)} { instrument percussion volume ${drum.volume ?? 11} }\n  ${wrap(chords.map((_, i) => drum.bar(i)))}\n`;
  }
  writeFileSync(path.join(outDir, file), tex);
  return file;
}

const strum4 = (c) => `:4 ${GTR[c]} ${GTR[c]} ${GTR[c]} ${GTR[c]}`;
const strumFolk = (c) => `:4 ${GTR[c]} :8 ${GTR[c]} ${GTR[c]} :4 r ${GTR[c]}`;
const chug8 = (c) => `:8 ${Array(8).fill(GTR[c]).join(' ')}`;

const files = [];

// 1) Daha Dün Annemizin — geleneksel çocuk şarkısı (ezgisi 19. yy halk ezgisi "Hänschen klein")
files.push(song({
  file: '01-daha-dun-annemizin.atex',
  title: 'Daha Dün Annemizin',
  artist: 'Geleneksel çocuk şarkısı',
  tempo: 96,
  melody: [
    ':4 3.1 0.1 :2 0.1', ':4 1.1 3.2 :2 3.2', ':4 1.2 3.2 0.1 1.1', ':4 3.1 3.1 :2 3.1',
    ':4 3.1 0.1 :2 0.1', ':4 1.1 3.2 :2 3.2', ':4 1.2 0.1 3.1 3.1', ':1 1.2',
    ':4 3.2 3.2 3.2 3.2', ':4 3.2 0.1 :2 1.1', ':4 0.1 0.1 0.1 0.1', ':4 0.1 1.1 :2 3.1',
    ':4 3.1 0.1 :2 0.1', ':4 1.1 3.2 :2 3.2', ':4 1.2 0.1 3.1 3.1', ':1 1.2',
  ],
  chords: ['C', 'G7', 'C', 'C', 'C', 'G7', 'C', 'C', 'G7', 'G7', 'C', 'C', 'C', 'G7', 'C', 'C'],
  accomp: strum4,
  pad: true,
  drum: {
    name: 'Tef', volume: 9,
    bar: () => ':4 54 :8 54 54 :4 54 54',
  },
}));

// 2) Ege Rüzgârı — hicaz havasında alıştırma parçası (Claude'un bestesi)
files.push(song({
  file: '02-ege-ruzgari.atex',
  title: 'Ege Rüzgârı (Hicaz alıştırması)',
  artist: 'Claude · özgün alıştırma',
  tempo: 92,
  repeat: 2,
  melody: [
    ':8 2.3 3.3 2.2 3.2 :4 0.1 3.2',
    ':8 0.1 1.1 0.1 3.2 :4 2.2 0.1',
    ':8 3.2 2.2 3.2 0.1 :4 3.2 2.2',
    ':8 2.2 3.3 2.3 3.3 :2 2.3',
    ':8 0.1 1.1 3.1 1.1 :4 0.1 3.2',
    ':8 1.1 0.1 3.2 2.2 :4 3.2 0.1',
    ':8 3.2 2.2 3.3 2.2 :4 3.2 2.2',
    ':8 2.2 3.3 :4 2.3 :2 2.3',
  ],
  chords: ['A', 'A', 'Dm', 'A', 'Dm', 'Dm', 'Gm', 'A'],
  accomp: strumFolk,
  pad: true,
  drum: {
    name: 'Darbuka', volume: 12,
    // düm-tek ritmi: düm = alçak konga, tek = tiz bongo
    bar: () => ':8 64 60 r 60 64 r 60 r',
  },
}));

// 3) Power Chord Yolu — power chord geçişleri (Claude'un bestesi)
files.push(song({
  file: '03-power-chord-yolu.atex',
  title: 'Power Chord Yolu',
  artist: 'Claude · özgün alıştırma',
  tempo: 100,
  repeat: 2,
  melody: [
    `:4 ${GTR.E5} ${GTR.E5} ${GTR.E5} ${GTR.E5}`,
    `:4 ${GTR.G5} ${GTR.G5} ${GTR.A5} ${GTR.A5}`,
    `:4 ${GTR.E5} ${GTR.E5} ${GTR.E5} ${GTR.E5}`,
    `:4 ${GTR.C5} ${GTR.C5} ${GTR.D5} ${GTR.D5}`,
    `:8 ${GTR.E5} ${GTR.E5} :4 ${GTR.E5} :8 ${GTR.E5} ${GTR.E5} :4 ${GTR.E5}`,
    `:2 ${GTR.G5} ${GTR.A5}`,
    `:8 ${GTR.E5} ${GTR.E5} :4 ${GTR.E5} :8 ${GTR.E5} ${GTR.E5} :4 ${GTR.E5}`,
    `:2 ${GTR.C5} ${GTR.D5}`,
  ],
  chords: ['E5', 'G5/A5', 'E5', 'C5/D5', 'E5', 'G5/A5', 'E5', 'C5/D5'],
  accomp: chug8,
  drum: {
    name: 'Davul', volume: 12,
    bar: () => ':8 (36 42) 42 (38 42) 42 (36 42) (36 42) (38 42) 42',
  },
}));

console.log('Üretildi:', files.join(', '));
