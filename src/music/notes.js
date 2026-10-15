// Nota isimleri: hem harf (E, A...) hem Türkçe solfej (Mi, La...).
const LETTERS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const SOLFEGE = ['Do', 'Do#', 'Re', 'Re#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'];

export function noteName(midi) {
  const m = Math.round(midi);
  const pc = ((m % 12) + 12) % 12;
  return { letter: LETTERS[pc], solfege: SOLFEGE[pc], octave: Math.floor(m / 12) - 1 };
}

export function label(midi) {
  const n = noteName(midi);
  return `${n.letter}${n.octave} · ${n.solfege}`;
}

// Standart akort (kalından inceye): 6. tel → 1. tel
export const STANDARD_TUNING = [40, 45, 50, 55, 59, 64];
export const STRING_NAMES = ['Mi (E) · 6. tel', 'La (A) · 5. tel', 'Re (D) · 4. tel', 'Sol (G) · 3. tel', 'Si (B) · 2. tel', 'Mi (e) · 1. tel'];

export const FINGER_NAMES = {
  0: 'Açık tel',
  1: 'İşaret',
  2: 'Orta',
  3: 'Yüzük',
  4: 'Serçe',
};

// Parmak renkleri — şeritte ve klavyede aynı renkler kullanılır
export const FINGER_COLORS = {
  0: '#9aa4b2',
  1: '#4f9dff',
  2: '#3ccf8e',
  3: '#ffb341',
  4: '#ff6fa8',
};
