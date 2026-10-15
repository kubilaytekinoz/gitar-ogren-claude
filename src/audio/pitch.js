// Nota algılama çekirdeği.
// Tarayıcıya ve Node'a bağımlı değil; böylece testlerde de aynı kod çalışır.
//
// - detectPitch: McLeod Pitch Method (MPM). Tek nota için hızlı ve oktav
//   hatasına dayanıklı. Otokorelasyon FFT ile hesaplanır.
// - spectrum + notePresence: akorlarda (power chord, açık akor) beklenen her
//   notanın gerçekten çalıp çalmadığını spektrumdan kontrol eder.

export function nextPow2(n) {
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}

// Yerinde radix-2 karmaşık FFT.
export function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      let t = re[i]; re[i] = re[j]; re[j] = t;
      t = im[i]; im[i] = im[j]; im[j] = t;
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    const half = len >> 1;
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < half; k++) {
        const a = i + k, b = a + half;
        const tr = re[b] * cr - im[b] * ci;
        const ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr; im[b] = im[a] - ti;
        re[a] += tr; im[a] += ti;
        const ncr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = ncr;
      }
    }
  }
}

export function rms(buf) {
  let s = 0;
  for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
  return Math.sqrt(s / buf.length);
}

const cache = new Map();
function work(size) {
  let w = cache.get(size);
  if (!w) {
    w = { re: new Float64Array(size), im: new Float64Array(size) };
    cache.set(size, w);
  }
  return w;
}

/**
 * Tek nota frekansı bulur.
 * @param {Float32Array} buf  zaman alanı örnekleri (2048-4096 önerilir)
 * @param {number} sampleRate
 * @param {object} [opt]
 * @returns {{freq:number, clarity:number, rms:number}|null}
 */
export function detectPitch(buf, sampleRate, opt = {}) {
  const minFreq = opt.minFreq ?? 60; // düşük tuning için biraz pay
  const maxFreq = opt.maxFreq ?? 1400;
  const minRms = opt.minRms ?? 0.004;
  const n = buf.length;
  const level = rms(buf);
  if (level < minRms) return null;

  // DC kaldır
  let mean = 0;
  for (let i = 0; i < n; i++) mean += buf[i];
  mean /= n;

  const size = nextPow2(n * 2);
  const { re, im } = work(size);
  re.fill(0); im.fill(0);
  for (let i = 0; i < n; i++) re[i] = buf[i] - mean;
  fft(re, im);
  for (let i = 0; i < size; i++) {
    re[i] = re[i] * re[i] + im[i] * im[i];
    im[i] = 0;
  }
  fft(re, im); // gerçek kısım = n*otokorelasyon (ölçek önemsiz, oran alıyoruz)

  const maxLag = Math.min(n - 1, Math.floor(sampleRate / minFreq));
  const minLag = Math.max(2, Math.floor(sampleRate / maxFreq));
  const nsdf = new Float64Array(maxLag + 2);
  // r(tau) = re[tau] / size ; m(tau) = sum_{j=0}^{n-1-tau} x_j^2 + x_{j+tau}^2
  const x = (i) => buf[i] - mean;
  let m = (2 * re[0]) / size;
  nsdf[0] = 1;
  for (let tau = 1; tau <= maxLag + 1; tau++) {
    const a = x(tau - 1), b = x(n - tau);
    m -= a * a + b * b;
    const r = re[tau] / size;
    nsdf[tau] = m > 1e-12 ? (2 * r) / m : 0;
  }

  // Pozitif loblarda anahtar maksimumları bul
  const peaks = [];
  let pos = false, best = -1, bestVal = -Infinity;
  for (let tau = 1; tau <= maxLag; tau++) {
    const v = nsdf[tau];
    if (!pos && nsdf[tau - 1] <= 0 && v > 0) { pos = true; best = -1; bestVal = -Infinity; }
    if (pos) {
      if (v > bestVal) { bestVal = v; best = tau; }
      if (v <= 0 && nsdf[tau - 1] > 0) {
        pos = false;
        if (best >= minLag) peaks.push(best);
      }
    }
  }
  if (pos && best >= minLag && best < maxLag) peaks.push(best);
  if (!peaks.length) return null;

  let top = 0;
  for (const p of peaks) top = Math.max(top, nsdf[p]);
  const k = opt.threshold ?? 0.88;
  let chosen = peaks[0];
  for (const p of peaks) {
    if (nsdf[p] >= k * top) { chosen = p; break; }
  }
  // parabolik ara değer
  const y0 = nsdf[chosen - 1], y1 = nsdf[chosen], y2 = nsdf[chosen + 1];
  const den = y0 - 2 * y1 + y2;
  const shift = den !== 0 ? (0.5 * (y0 - y2)) / den : 0;
  const lag = chosen + Math.max(-1, Math.min(1, shift));
  const clarity = y1;
  if (clarity < (opt.minClarity ?? 0.75)) return null;
  const freq = sampleRate / lag;
  if (freq < minFreq || freq > maxFreq) return null;
  return { freq, clarity, rms: level };
}

export function freqToMidi(f) {
  return 69 + 12 * Math.log2(f / 440);
}
export function midiToFreq(m) {
  return 440 * Math.pow(2, (m - 69) / 12);
}

/**
 * Hann pencereli genlik spektrumu (dB).
 * @returns {{db: Float32Array, binHz: number, floor: number}}
 */
export function spectrum(buf, sampleRate) {
  const n = nextPow2(buf.length);
  const { re, im } = work(n);
  re.fill(0); im.fill(0);
  const L = buf.length;
  for (let i = 0; i < L; i++) {
    const w = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (L - 1));
    re[i] = buf[i] * w;
  }
  fft(re, im);
  const half = n >> 1;
  const db = new Float32Array(half);
  for (let i = 0; i < half; i++) {
    const mag = Math.sqrt(re[i] * re[i] + im[i] * im[i]) / L;
    db[i] = 20 * Math.log10(mag + 1e-12);
  }
  // gürültü tabanı: 60-2000 Hz aralığında medyan
  const lo = Math.floor(60 / (sampleRate / n));
  const hi = Math.min(half - 1, Math.floor(2000 / (sampleRate / n)));
  const slice = Array.from(db.subarray(lo, hi)).sort((a, b) => a - b);
  const floor = slice[Math.floor(slice.length / 2)] ?? -120;
  return { db, binHz: sampleRate / n, floor };
}

function peakNear(spec, f, cents) {
  const { db, binHz } = spec;
  const lo = Math.max(1, Math.floor((f * Math.pow(2, -cents / 1200)) / binHz));
  const hi = Math.min(db.length - 2, Math.ceil((f * Math.pow(2, cents / 1200)) / binHz));
  let best = -Infinity;
  for (let i = lo; i <= hi; i++) if (db[i] > best) best = db[i];
  return best;
}

/**
 * Beklenen notanın spektrumda ne kadar belirgin olduğunu döndürür (gürültü
 * tabanının kaç dB üstünde). Temel frekans ve ilk iki harmonik kontrol edilir;
 * yanlış perdeye basıldığında komşu yarım seslerle karşılaştırılarak elenir.
 */
export function notePresence(spec, midi) {
  const f0 = midiToFreq(midi);
  let here = -Infinity, neighbor = -Infinity;
  for (const h of [1, 2, 3]) {
    const f = f0 * h;
    if (f > 4000) break;
    here = Math.max(here, peakNear(spec, f, 25) - (h - 1) * 2);
    neighbor = Math.max(
      neighbor,
      peakNear(spec, f * Math.pow(2, 1 / 12), 20) - (h - 1) * 2,
      peakNear(spec, f * Math.pow(2, -1 / 12), 20) - (h - 1) * 2,
    );
  }
  return { above: here - spec.floor, vsNeighbor: here - neighbor, db: here };
}

/**
 * Beklenen nota grubunun (akor) çalınıp çalınmadığına karar verir.
 * @param {number[]} midis
 * @returns {{hit:boolean, found:number, total:number}}
 */
export function matchChord(spec, midis, opt = {}) {
  const minAbove = opt.minAbove ?? 18;
  let found = 0;
  for (const m of midis) {
    const p = notePresence(spec, m);
    if (p.above >= minAbove && p.vsNeighbor > -3) found++;
  }
  const need = midis.length <= 2 ? midis.length : Math.ceil(midis.length * 0.66);
  return { hit: found >= need, found, total: midis.length };
}

/**
 * Akor kontrolü, yalnızca son vuruştan SONRAKİ sesle yapılır (önceki akorun
 * çınlaması karışmaz). Her beklenen nota için harmoniklerinin toplam gücü,
 * bir yarım ses aşağı/yukarısıyla karşılaştırılır: yanlış perdeye basılmışsa
 * komşu nota daha güçlü çıkar ve reddedilir.
 * @param {Float32Array} post vuruştan sonraki örnekler (en az ~90 ms)
 * @returns {{hit:boolean, found:number, total:number}}
 */
export function matchChordAfterAttack(post, sampleRate, midis, opt = {}) {
  const n = post.length;
  const size = Math.max(16384, nextPow2(n * 2));
  const { re, im } = work(size);
  re.fill(0); im.fill(0);
  for (let i = 0; i < n; i++) re[i] = post[i] * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1)));
  fft(re, im);
  const half = size >> 1;
  const binHz = sampleRate / size;
  const mag = new Float32Array(half);
  for (let i = 0; i < half; i++) mag[i] = Math.hypot(re[i], im[i]);
  const lo = Math.floor(60 / binHz), hi = Math.min(half - 1, Math.floor(2500 / binHz));
  const sorted = Array.from(mag.subarray(lo, hi)).sort((a, b) => a - b);
  const floor = sorted[Math.floor(sorted.length * 0.5)] + 1e-9;
  const at = (f) => {
    const b = f / binHz;
    const i0 = Math.max(1, Math.floor(b) - 1), i1 = Math.min(half - 2, Math.ceil(b) + 1);
    let m = 0;
    for (let i = i0; i <= i1; i++) if (mag[i] > m) m = mag[i];
    return m;
  };
  const W = [1, 1, 0.8, 0.6];
  const sal = (m) => {
    const f = midiToFreq(m);
    let s = 0;
    for (let h = 1; h <= 4; h++) if (f * h < 5000) s += W[h - 1] * at(f * h);
    return s;
  };
  const minRatio = opt.minRatio ?? 1.25;
  let found = 0;
  for (const m of midis) {
    const s0 = sal(m);
    const nb = Math.max(sal(m - 1), sal(m + 1));
    if (s0 > floor * 12 && s0 > nb * minRatio) found++;
  }
  const need = midis.length <= 2 ? midis.length : Math.ceil(midis.length * 0.66);
  return { hit: found >= need, found, total: midis.length };
}
