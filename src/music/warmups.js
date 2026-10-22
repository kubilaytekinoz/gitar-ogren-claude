// Parmak ısınması egzersizleri ve günlük program.
// Her egzersiz alphaTex olarak üretilir; tempo, başarına göre gün gün artar.

const strRun = (s, frets) => frets.map((f) => `${f}.${s}`).join(' ');

const EM = '(0.1 0.2 0.3 2.4 2.5 0.6)';
const AM = '(0.1 1.2 2.3 2.4 0.5)';
const D = '(2.1 3.2 2.3 0.4)';
const G = '(3.1 0.2 0.3 0.4 2.5 3.6)';
const G5 = '(3.6 5.5 5.4)';
const C5 = '(3.5 5.4 5.3)';
const A5 = '(5.6 7.5 7.4)';
const D5 = '(5.5 7.4 7.3)';
// 2 telli power chord (kök + beşli): işaret + yüzük parmağı
const F2 = '(1.6 3.5)';
const G2 = '(3.6 5.5)';
const A2 = '(5.6 7.5)';
const C2 = '(3.5 5.4)';
const D2 = '(5.5 7.4)';
const x4 = (c) => `${c} ${c} ${c} ${c}`;

export const WARMUPS = [
  {
    id: 'acik-teller',
    title: 'Açık Teller · Pena Kontrolü',
    desc: 'Sol el yok, sadece pena. Her teli 4 kez aşağı-yukarı (alternatif) vur. Teli tam ortalamaya odaklan.',
    focus: 'Sağ el',
    startTempo: 70, maxTempo: 140, step: 6,
    bars: [
      `:8 ${strRun(6, [0, 0, 0, 0])} ${strRun(5, [0, 0, 0, 0])}`,
      `:8 ${strRun(4, [0, 0, 0, 0])} ${strRun(3, [0, 0, 0, 0])}`,
      `:8 ${strRun(2, [0, 0, 0, 0])} ${strRun(1, [0, 0, 0, 0])}`,
      ':8 0.1 0.2 0.3 0.4 0.5 0.6 :4 r',
    ],
  },
  {
    id: 'kromatik',
    title: 'Kromatik 1-2-3-4',
    desc: 'Her perdeye bir parmak: 1. perde işaret, 2. orta, 3. yüzük, 4. serçe. Parmakları teldeki yerinde bırakmaya çalış.',
    focus: 'Sol el · parmak bağımsızlığı',
    startTempo: 60, maxTempo: 120, step: 5,
    bars: [
      `:8 ${strRun(6, [1, 2, 3, 4])} ${strRun(5, [1, 2, 3, 4])}`,
      `:8 ${strRun(4, [1, 2, 3, 4])} ${strRun(3, [1, 2, 3, 4])}`,
      `:8 ${strRun(2, [1, 2, 3, 4])} ${strRun(1, [1, 2, 3, 4])}`,
      `:8 ${strRun(1, [4, 3, 2, 1])} ${strRun(2, [4, 3, 2, 1])}`,
      `:8 ${strRun(3, [4, 3, 2, 1])} ${strRun(4, [4, 3, 2, 1])}`,
      `:8 ${strRun(5, [4, 3, 2, 1])} ${strRun(6, [4, 3, 2, 1])}`,
    ],
  },
  {
    id: 'orumcek',
    title: 'Örümcek 1-3-2-4',
    desc: 'Kromatiğin zor kardeşi: parmak sırası 1-3-2-4. Yavaş başla, temiz ses tempo hızından önemli.',
    focus: 'Sol el · koordinasyon',
    startTempo: 50, maxTempo: 110, step: 5,
    bars: [
      `:8 ${strRun(6, [1, 3, 2, 4])} ${strRun(5, [1, 3, 2, 4])}`,
      `:8 ${strRun(4, [1, 3, 2, 4])} ${strRun(3, [1, 3, 2, 4])}`,
      `:8 ${strRun(2, [1, 3, 2, 4])} ${strRun(1, [1, 3, 2, 4])}`,
      `:8 ${strRun(1, [4, 2, 3, 1])} ${strRun(2, [4, 2, 3, 1])}`,
      `:8 ${strRun(3, [4, 2, 3, 1])} ${strRun(4, [4, 2, 3, 1])}`,
      `:8 ${strRun(5, [4, 2, 3, 1])} ${strRun(6, [4, 2, 3, 1])}`,
    ],
  },
  {
    id: 'pentatonik',
    title: 'La Minör Pentatonik (5. perde)',
    desc: 'Rock ve türkülerde en çok kullanılan dizi. İşaret parmağın 5. perdede sabit dursun.',
    focus: 'Dizi · solo temeli',
    startTempo: 60, maxTempo: 130, step: 5,
    bars: [
      ':8 5.6 8.6 5.5 7.5 5.4 7.4 5.3 7.3',
      ':8 5.2 8.2 5.1 8.1 8.1 5.1 8.2 5.2',
      ':8 7.3 5.3 7.4 5.4 7.5 5.5 8.6 5.6',
      ':1 5.6',
    ],
  },
  {
    id: 'pc-iki-tel',
    title: 'Power Chord 1 · İki Tel',
    desc: 'Sadece iki tel: işaret parmağı 6. telde kök, yüzük parmağı 2 perde ileride 5. telde. Bastır, çal, bırak. Acele yok.',
    focus: 'Akor · power chord ilk adım',
    startTempo: 50, maxTempo: 100, step: 4,
    bars: [`:2 ${G2} ${G2}`, `:4 ${x4(G2)}`, `:2 ${A2} ${A2}`, `:4 ${x4(A2)}`],
  },
  {
    id: 'pc-kaydir',
    title: 'Power Chord 2 · Kaydırma',
    desc: 'Aynı iki telli şekli 6. telde kaydır: Sol5 → La5 → Fa5. Parmakların şeklini bozma, eli bütün olarak taşı.',
    focus: 'Akor · şekli taşıma',
    startTempo: 50, maxTempo: 100, step: 4,
    bars: [`:4 ${G2} ${G2} ${A2} ${A2}`, `:4 ${F2} ${F2} ${G2} ${G2}`, `:2 ${A2} ${G2}`, `:8 ${x4(G2)} ${x4(A2)}`],
  },
  {
    id: 'pc-besinci',
    title: 'Power Chord 3 · 6. Telden 5. Tele',
    desc: 'Sol5 (6. tel) → Do5 (5. tel) aynı perdede. Şekil aynı kalır, sadece bir tel aşağı iner.',
    focus: 'Akor · tel değiştirme',
    startTempo: 50, maxTempo: 100, step: 4,
    bars: [`:4 ${x4(G2)}`, `:4 ${x4(C2)}`, `:4 ${A2} ${A2} ${D2} ${D2}`, `:2 ${G2} ${C2}`],
  },
  {
    id: 'power-chord',
    title: 'Power Chord 4 · Üç Tel',
    desc: 'Tam şekil: serçe parmağı da yüzüğün altına, 4. tele. Sol5 → Do5 → La5 → Re5. Çalmayan telleri işaret parmağının ucuyla sustur.',
    focus: 'Akor · power chord',
    startTempo: 60, maxTempo: 120, step: 5,
    bars: [
      `:4 ${G5} ${G5} ${G5} ${G5}`,
      `:4 ${C5} ${C5} ${C5} ${C5}`,
      `:4 ${A5} ${A5} ${A5} ${A5}`,
      `:4 ${D5} ${D5} ${D5} ${D5}`,
      `:8 ${G5} ${G5} ${G5} ${G5} ${C5} ${C5} ${C5} ${C5}`,
      `:8 ${A5} ${A5} ${A5} ${A5} ${D5} ${D5} ${D5} ${D5}`,
    ],
  },
  {
    id: 'acik-akorlar',
    title: 'Açık Akor Geçişleri',
    desc: 'Mi minör → La minör → Re → Sol. Bir sonraki akora ölçünün son vuruşunda hazırlan.',
    focus: 'Akor · geçiş',
    startTempo: 50, maxTempo: 100, step: 4,
    bars: [`:2 ${EM} ${EM}`, `:2 ${AM} ${AM}`, `:2 ${D} ${D}`, `:2 ${G} ${G}`],
  },
];

/** Egzersizi, hafif bir metronom/davul eşliğiyle alphaTex'e çevirir. */
export function buildWarmupTex(w, tempo) {
  const bars = w.bars;
  // egzersiz iki kez tekrarlanır
  const pre = (i) => (i === 0 ? '\\ts (4 4) \\ro ' : '') + (i === bars.length - 1 ? '\\rc 2 ' : '');
  const user = bars.map((b, i) => pre(i) + b).join(' |\n  ');
  const click = bars.map((_, i) => pre(i) + ':4 (36 37) 37 37 37').join(' |\n  ');
  return `\\title "${w.title}"\n\\artist "Isınma"\n\\tempo ${Math.round(tempo)}\n.\n` +
    `\\track "Senin Partin" { instrument electricguitarclean volume 13 }\n  \\staff {tabs}\n  \\tuning E4 B3 G3 D3 A2 E2\n  ${user}\n` +
    `\\track "Tempo" { instrument percussion volume 8 }\n  ${click}\n`;
}

/** Bugün yapılacak 3 egzersiz: ders yolundaki fazına göre, günden güne dönüşümlü.
 *  slots: her eleman bir id ya da dönüşümlü id listesi. */
export function dailyRoutine(dayNumber, slots = ['acik-teller', ['kromatik', 'orumcek', 'pentatonik'], ['power-chord', 'acik-akorlar']]) {
  const by = (id) => WARMUPS.find((w) => w.id === id);
  return slots.map((s) => by(Array.isArray(s) ? s[dayNumber % s.length] : s));
}

/** Son sonuca göre bir sonraki tempo. */
export function nextTempo(w, current, accuracy) {
  const t = current ?? w.startTempo;
  if (accuracy >= 90) return Math.min(w.maxTempo, t + w.step);
  if (accuracy < 60) return Math.max(w.startTempo - 10, t - w.step);
  return t;
}
