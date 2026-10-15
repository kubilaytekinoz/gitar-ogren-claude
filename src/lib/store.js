// Ayarlar ve ilerleme kaydı (bilgisayarda kalıcı olarak saklanır)
const api = window.gitar;

export const DEFAULT_SETTINGS = {
  inputDeviceId: null,
  inputGain: 1,
  latencyMs: 40,
  difficulty: 'normal', // kolay | normal | zor
  zoom: 0.22, // ekranda notaların akış hızı (piksel / ms)
  showSheet: true,
  guide: false, // kendi partini kısık sesle duy
  metronome: false,
  countIn: true,
  waitMode: false,
  volume: 0.9,
};

export const TOLERANCE = { kolay: 230, normal: 160, zor: 100 };

let settings = { ...DEFAULT_SETTINGS };
let progress = { days: {}, warmupTempo: {}, songBest: {}, firstDay: null, lastSong: null };

export async function loadAll() {
  const s = (await api.store.get('settings')) || {};
  settings = { ...DEFAULT_SETTINGS, ...s };
  const p = (await api.store.get('progress')) || {};
  progress = { ...progress, ...p };
  if (!progress.firstDay) {
    progress.firstDay = dayKey();
    saveProgress();
  }
}

export const getSettings = () => settings;
export function setSetting(key, value) {
  settings[key] = value;
  api.store.set('settings', settings);
}

export const getProgress = () => progress;
export function saveProgress() {
  api.store.set('progress', progress);
}

export function dayKey(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function today() {
  const k = dayKey();
  progress.days[k] = progress.days[k] || { seconds: 0, warmups: {}, songs: 0 };
  return progress.days[k];
}

export function dayNumber(date = new Date()) {
  const first = new Date(progress.firstDay + 'T00:00:00');
  const now = new Date(dayKey(date) + 'T00:00:00');
  return Math.max(0, Math.round((now - first) / 86400000));
}

export function addPracticeSeconds(sec) {
  if (sec <= 0) return;
  today().seconds += sec;
  saveProgress();
}

/** Bir gün "tamam" sayılır: günlük ısınmanın hepsi bitti ya da 10 dk çalışıldı. */
export function dayStatus(key, routineIds) {
  const d = progress.days[key];
  if (!d) return 'none';
  const done = routineIds ? routineIds.every((id) => d.warmups?.[id] != null) : Object.keys(d.warmups || {}).length >= 3;
  if (done || d.seconds >= 600) return 'done';
  if (d.seconds > 0 || Object.keys(d.warmups || {}).length) return 'part';
  return 'none';
}

export function streak(routineFor) {
  let n = 0;
  const d = new Date();
  // bugün henüz bitmediyse dünden say
  if (dayStatus(dayKey(d), routineFor?.(d)) !== 'done') d.setDate(d.getDate() - 1);
  for (;;) {
    if (dayStatus(dayKey(d), routineFor?.(d)) !== 'done') break;
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}
