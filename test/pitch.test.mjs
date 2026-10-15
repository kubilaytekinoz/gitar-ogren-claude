// Sentetik "elektro gitar" sesleriyle nota algılama testi: node test/pitch.test.mjs
import { detectPitch, freqToMidi, midiToFreq, matchChordAfterAttack } from '../src/audio/pitch.js';
const SR = 48000;
function pluck(midis, len, { noise = 0.002, t0 = 0.05, seed = 1 } = {}) {
  let s = seed; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647) - 0.5;
  const buf = new Float32Array(len);
  for (const m of midis) {
    const f = midiToFreq(m) * (1 + rnd() * 0.002);
    // pickup benzeri: zayıf-ish temel, güçlü 2-3. harmonik
    const amps = [0.6, 1.0, 0.7, 0.45, 0.3, 0.2, 0.12, 0.08];
    for (let h = 1; h <= amps.length; h++) {
      if (f * h > SR / 2) break;
      const ph = rnd() * 6.28;
      for (let i = 0; i < len; i++) {
        const t = i / SR + t0;
        buf[i] += (amps[h - 1] * 0.08 * Math.exp(-t * (1.2 + h * 0.6)) * Math.sin(2 * Math.PI * f * h * t + ph)) / midis.length ** 0.5;
      }
    }
  }
  for (let i = 0; i < len; i++) buf[i] += rnd() * noise * 2;
  return buf;
}
let fail = 0, total = 0;
const names = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
for (let m = 40; m <= 88; m++) { // E2 .. E6 (24. perde)
  for (const seed of [1, 7, 13]) {
    total++;
    const r = detectPitch(pluck([m], 4096, { seed }), SR);
    const got = r ? Math.round(freqToMidi(r.freq)) : null;
    if (got !== m) { fail++; console.log('HATA', names[m % 12] + (Math.floor(m / 12) - 1), '->', got, r && r.clarity.toFixed(2)); }
  }
}
console.log(`Tek nota: ${total - fail}/${total} doğru`);
// sessizlikte nota uydurmamalı
const quiet = new Float32Array(4096).map(() => (Math.random() - 0.5) * 0.002);
console.log('Sessizlik ->', detectPitch(quiet, SR) === null ? 'tamam (algılama yok)' : 'HATA');
// akorlar: önceki akor hâlâ çınlarken yeni akor çalınıyor; yalnızca vuruş sonrası ses değerlendirilir
function mix(a, b, offset) {
  const out = new Float32Array(Math.max(a.length, offset + b.length));
  out.set(a);
  for (let i = 0; i < b.length; i++) out[offset + i] += b[i];
  return out;
}
const chords = {
  'Mi5 (E5)': [40, 47, 52], 'Sol5 (G5)': [43, 50, 55], 'La5 (A5)': [45, 52, 57], 'Do5 (C5)': [48, 55, 60], 'Re5 (D5)': [50, 57, 62],
  'Mi minör': [40, 47, 52, 55, 59, 64], 'Do majör': [48, 52, 55, 60, 64], 'Sol majör': [43, 47, 50, 55, 59, 67], 'Re majör': [50, 57, 62, 66], 'La minör': [45, 52, 57, 60, 64],
};
let cf = 0, ct = 0;
for (const [name, ms] of Object.entries(chords)) {
  for (const shift of [0, 1, -1]) {
    for (const postMs of [90, 150, 300]) {
      ct++;
      const before = pluck(ms, SR * 1.5, { seed: 5 });
      const after = pluck(ms.map((x) => x + shift), SR * 0.6, { seed: 9, t0: 0 });
      const at = Math.floor(SR * 0.6);
      const all = mix(before, after, at);
      const r = matchChordAfterAttack(all.subarray(at, at + Math.floor((postMs / 1000) * SR)), SR, ms);
      const ok = shift === 0 ? r.hit : !r.hit;
      if (!ok) { cf++; console.log('HATA akor', name, shift ? `${shift > 0 ? '+' : ''}${shift} yarım ses` : 'doğru', postMs + 'ms', `${r.found}/${r.total}`); }
    }
  }
}
console.log(`Akorlar (doğruyu kabul, yarım ses kaymışı ret): ${ct - cf}/${ct} doğru`);
process.exit(fail > total * 0.02 || cf ? 1 : 0);
