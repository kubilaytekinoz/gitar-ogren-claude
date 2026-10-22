// Kişisel ders yolu: 5 faz, her fazın günlük ısınması, şarkıları ve ölçülen hedefleri.
import { getProgress, saveProgress, dayKey, dayNumber } from '../lib/store.js';
import { dailyRoutine, WARMUPS } from './warmups.js';

// Hedef: egzersizi en az %90 doğrulukla bu tempoda çalmak.
export const PHASES = [
  {
    n: 1, title: 'Sol eli uyandır', weeks: '1-3. hafta',
    focus: 'Parmaklar güçlensin, nasırlaşsın, 4 parmak bağımsız çalışsın.',
    routine: ['acik-teller', 'kromatik', ['orumcek', 'kromatik']],
    songs: ['b:01-daha-dun-annemizin.atex', 'b:riff-01-bozkir-riffi.atex'],
    goals: [
      { warmup: 'kromatik', tempo: 70 },
      { warmup: 'acik-teller', tempo: 90 },
    ],
    stuck: 'Parmak uçların acıyorsa günü ikiye böl (sabah 10, akşam 10 dakika). Kromatikte takıldıysan önce sadece 6. ve 5. teli çal.',
  },
  {
    n: 2, title: 'Power chord engelini aş', weeks: '3-6. hafta',
    focus: 'Önce 2 telli şekil, sonra kaydırma, sonra tel değiştirme, en son 3 telli tam şekil.',
    routine: ['kromatik', ['pc-iki-tel', 'pc-kaydir'], ['pc-besinci', 'power-chord']],
    songs: ['b:03-power-chord-yolu.atex', 'b:riff-02-palm-mute-yolu.atex'],
    goals: [
      { warmup: 'pc-iki-tel', tempo: 70 },
      { warmup: 'pc-kaydir', tempo: 70 },
      { warmup: 'pc-besinci', tempo: 70 },
      { warmup: 'power-chord', tempo: 70 },
    ],
    stuck: 'Basmakta çok zorlanıyorsan gitarın tel yüksekliğini bir müzik mağazasında ayarlat. Bir de 3 telli yerine 2 telliyle devam et; şarkılarda da işe yarar.',
  },
  {
    n: 3, title: 'Ritim ve açık akorlar', weeks: '6-10. hafta',
    focus: 'Em, Am, D, G, C akorları ve ↓ ↓ ↑ ↑ ↓ ↑ ritmi.',
    routine: ['kromatik', 'acik-akorlar', ['power-chord', 'pc-besinci']],
    songs: ['b:01-daha-dun-annemizin.atex', 'b:02-ege-ruzgari.atex'],
    goals: [{ warmup: 'acik-akorlar', tempo: 70 }],
    stuck: 'Akor geçişinde takılıyorsan sadece iki akoru (Em ↔ Am) bir dakika boyunca gidip gel.',
  },
  {
    n: 4, title: 'Riff ve melodi', weeks: '10-16. hafta',
    focus: 'La minör pentatonik, hammer-on ve pull-off, Anadolu rock riffleri.',
    routine: ['orumcek', 'pentatonik', ['acik-akorlar', 'power-chord']],
    songs: ['b:riff-03-hicaz-riffi.atex', 'b:riff-04-pentatonik-lick.atex', 'b:riff-05-hammer-pull.atex'],
    goals: [{ warmup: 'pentatonik', tempo: 85 }, { warmup: 'orumcek', tempo: 75 }],
    stuck: 'Pentatonikte kaybolursan sadece kalın üç telini çal, şekli ezberleyince inceleri ekle.',
  },
  {
    n: 5, title: 'Solo temelleri', weeks: '4. aydan sonra',
    focus: 'Bend, vibrato, slide; yavaş sololar.',
    routine: ['orumcek', 'pentatonik', ['power-chord', 'acik-akorlar']],
    songs: ['b:riff-06-kurdi-solo.atex', 'b:riff-07-uzun-hava-solo.atex', 'b:riff-08-hizli-pena.atex'],
    goals: [{ warmup: 'pentatonik', tempo: 110 }],
    stuck: 'Solo hızlı geliyorsa şarkıyı %60 hızda çal, her gün %5 artır.',
  },
];

const prog = () => {
  const p = getProgress();
  p.phase = p.phase || 1;
  p.goalTempo = p.goalTempo || {};
  return p;
};

export const currentPhase = () => PHASES[prog().phase - 1];

/** Isınma sonucu: %90 ve üzeriyse o tempo hedef için kaydedilir. */
export function recordWarmup(id, tempo, accuracy, speed) {
  const p = prog();
  if (accuracy >= 90 && speed >= 1 && tempo > (p.goalTempo[id] || 0)) p.goalTempo[id] = tempo;
}

export function goalStatus(phase = currentPhase()) {
  const p = prog();
  return phase.goals.map((g) => {
    const w = WARMUPS.find((x) => x.id === g.warmup);
    const best = p.goalTempo[g.warmup] || 0;
    return { ...g, title: w?.title || g.warmup, best, done: best >= g.tempo };
  });
}

export function setPhase(n) {
  const p = prog();
  p.phase = Math.min(PHASES.length, Math.max(1, n));
  p.phaseSince = dayKey();
  saveProgress();
}

/** Bu fazda kaç gündür olduğu. */
export function daysInPhase() {
  const p = prog();
  if (!p.phaseSince) {
    p.phaseSince = dayKey();
    saveProgress();
  }
  const a = new Date(p.phaseSince + 'T00:00:00');
  const b = new Date(dayKey() + 'T00:00:00');
  return Math.round((b - a) / 86400000);
}

/** Bugünün ısınması (fazına göre). Seri hesabı bozulmasın diye güne kaydedilir. */
export function todayRoutine(dayRec) {
  const list = dailyRoutine(dayNumber(), currentPhase().routine);
  const ids = list.map((w) => w.id);
  if (dayRec && String(dayRec.routine) !== String(ids)) {
    dayRec.routine = ids;
    saveProgress();
  }
  return list;
}
