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
  F5: '(1.6 3.5 3.4)',
  B5: '(2.5 4.4 4.3)',
};
// Bas kökleri (4 telli bas; tel 1 = Sol, 4 = Mi)
const BASS = {
  C: '3.3', G7: '3.4', G: '3.4', A: '0.3', Dm: '0.2', D: '0.2', Gm: '3.4', E: '0.4', F: '1.4',
  E5: '0.4', G5: '3.4', A5: '0.3', C5: '3.3', D5: '0.2', F5: '1.4', B5: '2.3', Em: '0.4', Am: '0.3',
};
const BASS5 = { C: '0.1', G7: '0.2', G: '0.2', A: '2.2', Dm: '2.1', Gm: '0.2', E5: '2.3', G5: '0.2', A5: '2.2', C5: '0.1', D5: '2.1', F5: '3.3', B5: '4.2', E: '2.3', Em: '2.3', Am: '2.2' };
// Yaylılar için akor sesleri
const PAD = {
  C: '(c3 e3 g3)', G7: '(b2 d3 f3 g3)', A: '(a2 c#3 e3)', Dm: '(a2 d3 f3)', Gm: '(g2 bb2 d3)',
};

function song({ file, title, artist, tempo, ts = [4, 4], melody, chords, repeat = 1, accomp, drum, pad, voice = 'electricguitarclean', accompVoice, accompVolume }) {
  const bars = melody.length;
  const wrap = (arr) => arr.map((b, i) => {
    let pre = '';
    if (i === 0) pre += `\\ts (${ts[0]} ${ts[1]}) `;
    if (repeat > 1 && i === 0) pre += '\\ro ';
    if (repeat > 1 && i === bars - 1) pre += `\\rc ${repeat} `;
    return pre + b;
  }).join(' |\n  ');

  let tex = `\\title ${q(title)}\n\\artist ${q(artist)}\n\\tempo ${tempo}\n.\n`;
  tex += `\\track "Senin Partin" { instrument ${voice} volume 13 }\n  \\staff {score tabs}\n  \\tuning E4 B3 G3 D3 A2 E2\n  ${wrap(melody)}\n`;

  // "G5/A5" gibi yazılan ölçü: yarısı bir akor, yarısı diğeri
  const halves = (c) => c.split('/');
  if (accomp) {
    const gtrBars = chords.map((c) => {
      const h = halves(c);
      if (h.length === 1) return accomp(c);
      return h.map((x) => `:4 ${GTR[x]} ${GTR[x]}`).join(' ');
    });
    tex += `\\track "Ritim Gitarı" { instrument ${accompVoice ?? 'acousticguitarsteel'} volume ${accompVolume ?? 10} }\n  \\staff {tabs}\n  \\tuning E4 B3 G3 D3 A2 E2\n  ${wrap(gtrBars)}\n`;
  }

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


// ---------------- Riff & Solo paketi (hepsi Claude'un özgün alıştırmaları) ----------------
const ROCK = { name: 'Davul', volume: 12, bar: () => ':8 (36 42) 42 (38 42) 42 (36 42) (36 42) (38 42) 42' };
const HALF = { name: 'Davul', volume: 11, bar: () => ':4 (36 42) 42 (38 42) 42' };
const DARBUKA = { name: 'Darbuka', volume: 12, bar: () => ':8 64 60 r 60 64 r 60 r' };
const RIFF = 'Riff & Solo · Claude';

files.push(song({
  file: 'riff-01-bozkir-riffi.atex', title: '1 · Bozkır Riffi', artist: RIFF + ' · Mi minör pentatonik, kalın teller',
  tempo: 92, repeat: 2, voice: 'overdrivenguitar', drum: ROCK,
  melody: [
    ':8 0.6 0.6 3.6 0.6 :4 2.5 :8 0.5 2.5',
    ':8 0.6 0.6 3.6 0.6 :8 2.5 0.5 :4 3.6',
    ':8 0.6 0.6 3.6 0.6 :4 2.5 :8 0.5 2.5',
    ':8 0.6 3.6 0.5 2.5 :2 0.6',
  ],
  chords: ['Em', 'Em', 'Em', 'Em'],
}));

files.push(song({
  file: 'riff-02-palm-mute-yolu.atex', title: '2 · Palm Mute Yolu', artist: RIFF + ' · power chord riffi, sağ el kenarıyla telleri hafif sustur',
  tempo: 96, repeat: 2, voice: 'overdrivenguitar', drum: ROCK,
  melody: [
    `:8 ${GTR.E5} ${GTR.E5} ${GTR.E5} ${GTR.E5} ${GTR.E5} ${GTR.E5} ${GTR.G5} ${GTR.A5}`,
    `:8 ${GTR.E5} ${GTR.E5} ${GTR.E5} ${GTR.E5} :4 ${GTR.D5} ${GTR.C5}`,
    `:8 ${GTR.E5} ${GTR.E5} ${GTR.E5} ${GTR.E5} ${GTR.E5} ${GTR.E5} ${GTR.G5} ${GTR.A5}`,
    `:4 ${GTR.C5} ${GTR.D5} :2 ${GTR.E5}`,
  ],
  chords: ['E5', 'E5/C5', 'E5', 'C5/E5'],
}));

files.push(song({
  file: 'riff-03-hicaz-riffi.atex', title: '3 · Hicaz Riffi', artist: RIFF + ' · Mi hicaz (Mi Fa Sol# La Si Do), Anadolu rock havası',
  tempo: 100, repeat: 2, voice: 'overdrivenguitar', drum: DARBUKA,
  melody: [
    ':8 0.6 1.6 4.6 1.6 :4 0.6 0.6',
    ':8 0.5 4.6 1.6 4.6 :4 0.5 r',
    ':8 2.5 3.5 2.5 0.5 4.6 0.5 4.6 1.6',
    ':8 0.6 1.6 0.6 1.6 :2 0.6',
  ],
  chords: ['E', 'E', 'E', 'E'],
}));

files.push(song({
  file: 'riff-04-pentatonik-lick.atex', title: '4 · İlk Solo: Pentatonik Lick', artist: RIFF + ' · La minör pentatonik, 5. perde kutusu',
  tempo: 90, repeat: 2, voice: 'overdrivenguitar', drum: ROCK,
  accomp: (c) => `:8 ${Array(8).fill(GTR[c]).join(' ')}`, accompVoice: 'overdrivenguitar', accompVolume: 7,
  melody: [
    ':8 5.2 8.2 5.1 8.2 :4 5.2 7.3',
    ':8 5.3 7.3 5.3 7.4 :2 5.4',
    ':8 8.1 5.1 8.2 5.2 7.3 5.3 7.4 5.4',
    ':4 7.3 5.3 :2 7.4',
  ],
  chords: ['A5', 'F5', 'G5', 'A5'],
}));

files.push(song({
  file: 'riff-05-hammer-pull.atex', title: '5 · Hammer-on & Pull-off', artist: RIFF + ' · ikinci notaya pena vurma, parmakla çek/vur',
  tempo: 80, repeat: 2, voice: 'overdrivenguitar', drum: HALF,
  accomp: (c) => `:4 ${GTR[c]} ${GTR[c]} ${GTR[c]} ${GTR[c]}`, accompVoice: 'overdrivenguitar', accompVolume: 7,
  melody: [
    ':8 5.3{h} 7.3 5.3{h} 7.3 :4 5.2 :8 5.2{h} 8.2',
    ':8 8.2{h} 5.2 7.3{h} 5.3 :2 7.4',
    ':8 5.3{h} 7.3 5.3{h} 7.3 :4 5.2 :8 5.2{h} 8.2',
    ':8 8.1{h} 5.1 8.2{h} 5.2 :2 7.3',
  ],
  chords: ['A5', 'A5', 'A5', 'D5'],
}));

files.push(song({
  file: 'riff-06-kurdi-solo.atex', title: '6 · Kürdi Solo', artist: RIFF + ' · La kürdi (La Si♭ Do Re Mi Fa Sol), 5. perde',
  tempo: 88, repeat: 2, voice: 'overdrivenguitar', drum: DARBUKA,
  accomp: (c) => `:4 ${GTR[c]} ${GTR[c]} ${GTR[c]} ${GTR[c]}`, accompVoice: 'overdrivenguitar', accompVolume: 6,
  melody: [
    ':8 5.1 6.1 5.1 8.2 :4 6.2 5.2',
    ':8 6.2 5.2 7.3 5.3 :2 7.3',
    ':8 5.2 6.2 8.2 5.1 6.1 8.1 6.1 5.1',
    ':8 8.2 6.2 5.2 6.2 :2 7.4',
  ],
  chords: ['A5', 'F5', 'A5', 'G5/A5'],
}));

files.push(song({
  file: 'riff-07-uzun-hava-solo.atex', title: '7 · Ağır Solo (titreşimli)', artist: RIFF + ' · La minör, uzun notalarda vibrato yap',
  tempo: 70, repeat: 2, voice: 'overdrivenguitar', drum: HALF,
  accomp: (c) => `:2 ${GTR[c]} ${GTR[c]}`, accompVoice: 'overdrivenguitar', accompVolume: 6,
  melody: [
    ':4 5.1 7.1 :2 8.1{v}',
    ':4 7.1 5.1 :2 6.2{v}',
    ':4 5.2 6.2 8.2 5.1',
    ':4 4.1 7.1 :2 5.1{v}',
  ],
  chords: ['A5', 'F5', 'C5', 'E5/A5'],
}));

files.push(song({
  file: 'riff-08-hizli-pena.atex', title: '8 · Hızlı Pena (16\'lık)', artist: RIFF + ' · sürekli aşağı-yukarı alternatif pena',
  tempo: 80, repeat: 2, voice: 'overdrivenguitar', drum: ROCK,
  melody: [
    ':16 0.6 0.6 0.6 0.6 3.6 3.6 3.6 3.6 0.6 0.6 0.6 0.6 2.5 2.5 2.5 2.5',
    ':16 0.6 0.6 0.6 0.6 3.6 3.6 3.6 3.6 :8 5.6 3.6 2.5 0.5',
    ':16 0.6 0.6 0.6 0.6 3.6 3.6 3.6 3.6 0.6 0.6 0.6 0.6 2.5 2.5 2.5 2.5',
    ':16 0.6 0.6 0.6 0.6 :4 r :2 0.6',
  ],
  chords: ['Em', 'Em', 'Em', 'Em'],
}));

console.log('Üretildi:', files.join(', '));
