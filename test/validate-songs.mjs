// Hazır şarkıları ve ısınma egzersizlerini doğrular: node test/validate-songs.mjs
// - alphaTab ile hatasız açılıyor mu
// - her ölçünün süresi ölçü birimine (4/4 vb.) tam uyuyor mu
// - çalınacak parti doğru çıkarılıyor mu (nota sayısı, parmak numaraları)
import * as alphaTab from '@coderline/alphatab';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractEvents, playableTracks, simplifyEvents } from '../src/music/events.js';
import { WARMUPS, buildWarmupTex } from '../src/music/warmups.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let errors = 0;

function check(name, tex) {
  const settings = new alphaTab.Settings();
  let score;
  try {
    score = alphaTab.importer.ScoreLoader.loadAlphaTex(tex, settings);
  } catch (e) {
    console.error(`✗ ${name}: açılamadı`, e?.message ?? e);
    for (const d of e?.diagnostics?.items ?? e?.lexerDiagnostics?.items ?? []) console.error('   ', d.message ?? d);
    errors++;
    return;
  }
  // ölçü süreleri
  for (const track of score.tracks) {
    for (const staff of track.staves) {
      for (const bar of staff.bars) {
        const expected = bar.masterBar.calculateDuration();
        for (const v of bar.voices) {
          if (v.isEmpty || !v.beats.length) continue;
          const last = v.beats[v.beats.length - 1];
          const total = last.playbackStart + last.playbackDuration;
          if (total !== expected) {
            console.error(`✗ ${name}: "${track.name}" ${bar.index + 1}. ölçü süresi ${total}, olması gereken ${expected}`);
            errors++;
          }
        }
      }
    }
  }
  const midi = new alphaTab.midi.MidiFile();
  const gen = new alphaTab.midi.MidiFileGenerator(score, null, new alphaTab.midi.AlphaSynthMidiFileHandler(midi));
  gen.generate();
  const tracks = playableTracks(score);
  if (!tracks.length) {
    console.error(`✗ ${name}: çalınabilir gitar partisi yok`);
    errors++;
    return;
  }
  const { events } = extractEvents(score, tracks[0].index, gen.tickLookup);
  for (const lv of ['alistirma', 'kolay']) {
    const ev = simplifyEvents(events, lv);
    if (!ev.length || ev.length > events.length || ev.some((e) => !e.notes.length)) {
      console.error(`✗ ${name}: ${lv} seviyesi bozuk (${ev.length}/${events.length})`);
      errors++;
    } else console.log(`  ${lv}: ${ev.length}/${events.length} nota`);
  }
  const noFinger = events.flatMap((e) => e.notes).filter((n) => n.finger < 0);
  if (noFinger.length) {
    console.error(`✗ ${name}: ${noFinger.length} notaya parmak atanamadı`);
    errors++;
  }
  const secs = events.length ? events[events.length - 1].endMs / 1000 : 0;
  console.log(`✓ ${name}: ${score.tracks.length} iz, ${score.masterBars.length} ölçü, ${events.length} vuruş, ~${secs.toFixed(0)} sn`);
}

const songDir = path.join(root, 'songs');
for (const f of readdirSync(songDir).filter((f) => f.endsWith('.atex')).sort()) {
  check(f, readFileSync(path.join(songDir, f), 'utf8'));
}
for (const w of WARMUPS) {
  for (const tempo of [w.startTempo, w.maxTempo]) check(`ısınma: ${w.title} @${tempo}`, buildWarmupTex(w, tempo));
}

if (errors) {
  console.error(`\n${errors} hata bulundu.`);
  process.exit(1);
}
console.log('\nHepsi tamam.');
