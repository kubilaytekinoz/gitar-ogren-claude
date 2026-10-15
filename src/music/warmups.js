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
    id: 'power-chord',
    title: 'Power Chord Geçişleri',
    desc: 'Sol5 → Do5 → La5 → Re5. Kökü 6. telden 5. tele aynı perdede kaydır. Çalmayan telleri işaret parmağının ucuyla sustur.',
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

/** Bugün yapılacak 3 egzersiz: günden güne dönüşümlü. */
export function dailyRoutine(dayNumber) {
  const by = (id) => WARMUPS.find((w) => w.id === id);
  const left = ['kromatik', 'orumcek', 'pentatonik'];
  const chords = ['power-chord', 'acik-akorlar'];
  return [
    by('acik-teller'),
    by(left[dayNumber % left.length]),
    by(chords[dayNumber % chords.length]),
  ];
}

/** Son sonuca göre bir sonraki tempo. */
export function nextTempo(w, current, accuracy) {
  const t = current ?? w.startTempo;
  if (accuracy >= 90) return Math.min(w.maxTempo, t + w.step);
  if (accuracy < 60) return Math.max(w.startTempo - 10, t - w.step);
  return t;
}
