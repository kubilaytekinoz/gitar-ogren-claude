// Çalma ekranı: eşlik çalar, sen gitarını çalarsın, program dinleyip puanlar.
import { input } from '../audio/input.js';
import { matchChordAfterAttack } from '../audio/pitch.js';
import { extractEvents, playableTracks, TICKS_PER_QUARTER } from '../music/events.js';
import { label as noteLabel } from '../music/notes.js';
import { Highway } from './highway.js';
import { Fretboard } from './fretboard.js';
import { getSettings, setSetting, TOLERANCE, addPracticeSeconds } from '../lib/store.js';
import { h, toast, esc } from '../lib/dom.js';

const AT = window.alphaTab;
const SPEEDS = [0.5, 0.6, 0.75, 0.9, 1, 1.1, 1.25];

let soundFontUrl = 'app://local/vendor/alphatab/soundfont/sonivox.sf2';
export function setSoundFont(hasGeneralUser) {
  if (hasGeneralUser) soundFontUrl = 'app://local/assets/soundfont/GeneralUser-GS.sf2';
}

/**
 * @param {HTMLElement} root
 * @param {{title:string, artist?:string, source:{type:'url',url:string,format:'tex'|'binary'}|{type:'tex',tex:string},
 *          songId?:string, kind:'song'|'warmup', preferTrack?:number, onExit:(r:any)=>void, onResult?:(r:any)=>void,
 *          nextLabel?:string, onNext?:()=>void}} opts
 */
export function openPractice(root, opts) {
  const s = getSettings();
  root.innerHTML = '';
  const view = h(`
    <div class="play">
      <div class="play-top">
        <button class="btn icon ghost" data-a="exit" title="Kapat (Esc)">✕</button>
        <div class="song-name">${esc(opts.title)}<small>${esc(opts.artist || '')}</small></div>
        <div class="spacer"></div>
        <div class="transport">
          <button class="btn icon" data-a="restart" title="Baştan (Home)">⏮</button>
          <button class="btn primary play-btn" data-a="play" title="Çal / Duraklat (Boşluk)">▶ Çal</button>
          <div class="ctrl">
            <button class="btn icon" data-a="slower" title="Yavaşlat (-)">−</button>
            <span class="speed" data-r="speed" title="Hız">%100</span>
            <button class="btn icon" data-a="faster" title="Hızlandır (+)">+</button>
          </div>
        </div>
        <div class="spacer"></div>
        <div class="chips">
          <label class="ctrl small muted" data-r="trackWrap" hidden>Parti <select data-r="track"></select></label>
          <button class="chip" data-a="wait" title="Doğru notayı basana kadar şarkı durur">Bekle</button>
          <button class="chip" data-a="guide" title="Kendi partini kısık sesle duy">Kılavuz ses</button>
          <button class="chip" data-a="metro">Metronom</button>
          <button class="chip" data-a="loop" title="Tabda fareyle bir bölüm seç, sonra döngüye al">Döngü</button>
          <button class="chip" data-a="sheet" title="Tabı göster / gizle">Tab</button>
        </div>
      </div>
      <div class="play-mid">
        <div class="hud">
          <div><div class="big" data-r="acc">–</div><div class="lbl">isabet</div></div>
          <div><div class="big" data-r="streak">0</div><div class="lbl">seri</div></div>
          <div class="heard"><span class="lbl">Duyulan</span><span class="n" data-r="heard">–</span></div>
          <div class="feedback" data-r="fb"></div>
          <div class="spacer"></div>
          <div class="small muted" data-r="inputWarn" hidden>Gitar girişi kapalı. Ayarlar'dan Blackstar'ı seç; şimdilik sadece eşlik çalar.</div>
          <div class="small muted row" style="gap:14px">${Fretboard.legend()}</div>
        </div>
        <div class="highway-wrap">
          <canvas data-r="canvas"></canvas>
          <div class="loading" data-r="loading">Şarkı hazırlanıyor…</div>
          <div class="result" data-r="result" hidden></div>
        </div>
        <div class="fretboard" data-r="fret"></div>
      </div>
      <div class="sheet ${s.showSheet ? '' : 'hidden'}" data-r="sheet"><div data-r="at"></div></div>
    </div>`);
  root.appendChild(view);
  const $ = (r) => view.querySelector(`[data-r="${r}"]`);
  const btn = (a) => view.querySelector(`[data-a="${a}"]`);

  const highway = new Highway($('canvas'));
  highway.pxPerMs = s.zoom;
  const fret = new Fretboard($('fret'));

  // ---- durum ----
  let api = null;
  let score = null;
  let trackIndex = 0;
  let data = null; // {events, tempo}
  let bars = [];
  let playing = false;
  let speed = 1;
  let lastTick = 0, lastSongMs = 0;
  // şarkı saati: alphaTab'in seyrek konum bildirimleri arasında akıcı ilerler
  const clock = { base: 0, wall: performance.now(), moving: false };
  let judgeIdx = 0;
  let consumedAttack = -Infinity;
  let streakN = 0, bestStreak = 0;
  let waiting = null, waitStart = 0;
  let destroyed = false;
  let lastFrame = performance.now();
  let practiceAcc = 0;
  let fbTimer = 0;
  let ready = false;
  let finishedShown = false;

  // ---- alphaTab ----
  const atEl = $('at');
  const settings = {
    core: {
      fontDirectory: 'app://local/vendor/alphatab/font/',
      scriptFile: 'app://local/vendor/alphatab/alphaTab.js',
      logLevel: AT.LogLevel.Warning,
    },
    display: {
      layoutMode: AT.LayoutMode.Horizontal,
      staveProfile: AT.StaveProfile.Tab,
      scale: 1.0,
    },
    player: {
      playerMode: AT.PlayerMode.EnabledSynthesizer,
      soundFont: soundFontUrl,
      scrollElement: $('sheet'),
      enableCursor: true,
      enableUserInteraction: true,
    },
  };

  async function load() {
    try {
      let parsed;
      const loadSettings = new AT.Settings();
      if (opts.source.type === 'tex') {
        parsed = AT.importer.ScoreLoader.loadAlphaTex(opts.source.tex, loadSettings);
      } else if (opts.source.format === 'tex') {
        const txt = await (await fetch(opts.source.url)).text();
        parsed = AT.importer.ScoreLoader.loadAlphaTex(txt, loadSettings);
      } else {
        const buf = new Uint8Array(await (await fetch(opts.source.url)).arrayBuffer());
        parsed = AT.importer.ScoreLoader.loadScoreFromBytes(buf, loadSettings);
      }
      score = parsed;
      const tracks = playableTracks(score);
      if (!tracks.length) throw new Error('Bu dosyada gitar tabı bulunan bir parti yok.');
      trackIndex = tracks.some((t) => t.index === opts.preferTrack) ? opts.preferTrack : pickTrack(tracks);
      fillTrackSelect(tracks);
      if (score.title || score.artist) {
        opts.onMeta?.({ title: score.title, artist: score.artist });
        if (score.title && opts.kind === 'song') {
          view.querySelector('.song-name').innerHTML = `${esc(score.title)}<small>${esc(score.artist || opts.artist || '')}</small>`;
        }
      }

      api = new AT.AlphaTabApi(atEl, settings);
      api.masterVolume = s.volume;
      api.metronomeVolume = s.metronome ? 1 : 0;
      api.countInVolume = s.countIn ? 1 : 0;
      api.error.on((e) => {
        console.error(e);
        showLoading('Bir sorun oluştu: ' + (e?.message || e));
      });
      // Not: alphaTab 1.8.4'te midiLoaded'a abone olmak sonsuz döngüye giriyor; midiLoad kullanıyoruz.
      api.midiLoad.on(() => setTimeout(prepareEvents, 0));
      api.playerReady.on(() => maybeReady());
      api.playerStateChanged.on((e) => {
        const now = performance.now();
        clock.base = clockMs(now);
        clock.wall = now;
        clock.moving = false; // ilk ilerleyen konum bildirimine kadar bekle (geri sayım vb.)
        playing = e.state === 1;
        btn('play').textContent = playing ? '❚❚ Durdur' : '▶ Çal';
      });
      api.playerPositionChanged.on((e) => onPosition(e));
      api.playerFinished.on(() => onFinished());
      api.renderScore(score, [trackIndex]);
    } catch (e) {
      console.error(e);
      showLoading('Dosya açılamadı: ' + (e?.message || e));
    }
  }

  function pickTrack(tracks) {
    // "Senin Partin" ya da adında gitar geçen ilk parti
    const six = tracks.filter((t) => t.strings === 6);
    const named = six.find((t) => /senin/i.test(t.name)) || six.find((t) => t.isGuitar && /gitar|guitar|gtr|lead|solo/i.test(t.name));
    return (named || six.find((t) => t.isGuitar) || six[0] || tracks[0]).index;
  }

  function fillTrackSelect(tracks) {
    const sel = $('track');
    sel.innerHTML = tracks.map((t) => `<option value="${t.index}">${esc(t.name)}</option>`).join('');
    sel.value = String(trackIndex);
    $('trackWrap').hidden = tracks.length < 2;
    sel.onchange = () => {
      const prev = score.tracks[trackIndex];
      trackIndex = Number(sel.value);
      if (api) {
        api.changeTrackMute([prev], false);
        api.changeTrackVolume([prev], 1);
        api.stop();
        api.renderTracks([score.tracks[trackIndex]]);
        prepareEvents();
        applyTrackAudio();
      }
    };
  }

  function prepareEvents() {
    if (!api || !api.tickCache) return;
    data = extractEvents(score, trackIndex, api.tickCache);
    bars = [];
    const seen = new Set();
    for (const mb of api.tickCache.masterBars) {
      const key = mb.start;
      if (seen.has(key)) continue;
      seen.add(key);
      bars.push({ ms: data.tempo.tickToMs(mb.start), number: mb.masterBar.index + 1 });
    }
    highway.setData({ events: data.events, bars, stringCount: data.stringCount, tuning: data.tuning });
    resetJudging(0);
    applyTrackAudio();
    maybeReady();
  }

  function applyTrackAudio() {
    if (!api || !score) return;
    const t = score.tracks[trackIndex];
    if (getSettings().guide) {
      api.changeTrackMute([t], false);
      api.changeTrackVolume([t], 0.4);
    } else {
      api.changeTrackMute([t], true);
    }
  }

  function maybeReady() {
    if (ready || !data || !api || !api.isReadyForPlayback) return;
    ready = true;
    $('loading').hidden = true;
    toast('Hazır! Boşluk tuşuyla başlat.');
  }

  function showLoading(text) {
    const el = $('loading');
    el.hidden = false;
    el.textContent = text;
  }

  // ---- zaman ----
  const ticksPerMs = (tick) => (data ? (data.tempo.tempoAt(tick) * TICKS_PER_QUARTER) / 60000 : 1);

  function clockMs(now) {
    if (!playing || waiting || !clock.moving) return clock.base;
    return clock.base + Math.min(now - clock.wall, 500) * speed;
  }

  function onPosition(e) {
    const now = performance.now();
    const back = e.currentTick < lastTick - TICKS_PER_QUARTER / 2;
    const moved = e.currentTick !== lastTick;
    lastTick = e.currentTick;
    if (!data) return;
    const reported = data.tempo.tickToMs(lastTick);
    lastSongMs = reported;
    const predicted = clockMs(now);
    if (back || e.isSeek || !clock.moving || Math.abs(reported - predicted) > 120 * speed + 40) {
      clock.base = reported;
    } else {
      clock.base = predicted + (reported - predicted) * 0.2; // küçük sapmaları yumuşakça düzelt
    }
    clock.wall = now;
    clock.moving = moved && playing;
    if (back || e.isSeek) {
      // şarkı bittiğinde başa sarılır: sonuçları silme (döngü hariç)
      const complete = judgeIdx >= data.events.length;
      if (!complete || api?.isLooping) resetJudging(reported);
    }
  }

  function songMsNow(now) {
    if (!data) return 0;
    return clockMs(now);
  }

  function resetJudging(fromMs) {
    if (!data) return;
    for (const ev of data.events) {
      if (ev.ms >= fromMs - 1) {
        ev.state = 'pending';
        ev.offset = null;
        ev.hitAt = 0;
      }
    }
    judgeIdx = 0;
    while (judgeIdx < data.events.length && data.events[judgeIdx].state !== 'pending') judgeIdx++;
    consumedAttack = -Infinity;
    streakN = 0;
    waiting = null;
    finishedShown = false;
    updateHud(true);
  }

  // ---- değerlendirme ----
  function eventMatches(ev) {
    const st = input.state;
    if (!input.running) return false;
    if (ev.notes.length === 1) {
      const target = ev.notes[0].midi;
      if (st.midi === target) return true;
      // perde bulunamadıysa (ör. çok kısa/boğuk nota) vuruş sonrası spektruma bak
      if (st.midi == null && st.rms > 0.008 && performance.now() - input.lastAttack >= 70) {
        const post = input.postAttack();
        return !!post && matchChordAfterAttack(post, input.sampleRate, [target]).hit;
      }
      return false;
    }
    // akor: yalnızca son vuruştan sonraki sesle, en az ~90 ms dinledikten sonra karar ver
    if (performance.now() - input.lastAttack < 90) return false;
    const post = input.postAttack();
    if (!post) return false;
    return matchChordAfterAttack(post, input.sampleRate, ev.notes.map((n) => n.midi)).hit;
  }

  function attackSongMs(now, songNowAdj, ev) {
    // Son tel vuruşu şarkının hangi anına denk geliyor. Tek notada, doğru notaya
    // vurmadan geçiş (hammer-on / slide) de sayılır; akorda yalnızca gerçek vuruş.
    let wall = input.lastAttack;
    if (ev.notes.length === 1 && input.state.midi === ev.notes[0].midi) wall = Math.max(wall, input.lastPitchChange);
    return songNowAdj - (now - wall) * speed;
  }

  function judge(now, songMs) {
    if (!data) return;
    const cfg = getSettings();
    const tol = TOLERANCE[cfg.difficulty] * speed;
    const t = songMs - cfg.latencyMs * speed;
    const evs = data.events;

    if (waiting) {
      const wallAttack = waiting.notes.length === 1 ? Math.max(input.lastAttack, input.lastPitchChange) : input.lastAttack;
      if (wallAttack > waitStart - 150 && eventMatches(waiting)) {
        markHit(waiting, 0, now);
        waiting = null;
        api.play();
      }
      return;
    }

    if (cfg.waitMode && playing) {
      const ev = evs[judgeIdx];
      if (ev && ev.state === 'pending' && ev.ms <= songMs) {
        waiting = ev;
        waitStart = now;
        api.pause();
        return;
      }
    }

    for (let i = judgeIdx; i < evs.length; i++) {
      const ev = evs[i];
      if (ev.ms - tol > t) break;
      if (ev.state !== 'pending') continue;
      const attack = attackSongMs(now, t, ev);
      // vuruş, notanın başlangıcına ±tolerans içinde olmalı; karar için biraz daha dinlenir
      const windowEnd = ev.ms + tol + 220 * speed;
      const fresh = attack > consumedAttack + 1 && attack >= ev.ms - tol && attack <= ev.ms + tol;
      if (fresh && eventMatches(ev)) {
        consumedAttack = attack;
        markHit(ev, (attack - ev.ms) / speed, now);
        break; // bir vuruş tek bir notayı karşılar
      }
      if (t > windowEnd && !cfg.waitMode) markMiss(ev);
    }
    while (judgeIdx < evs.length && evs[judgeIdx].state !== 'pending') judgeIdx++;
  }

  function markHit(ev, offsetMs, now) {
    ev.state = 'hit';
    ev.offset = offsetMs;
    ev.hitAt = now;
    streakN++;
    bestStreak = Math.max(bestStreak, streakN);
    const tol = TOLERANCE[getSettings().difficulty];
    let txt = 'Harika!';
    if (!getSettings().waitMode) {
      if (offsetMs < -tol * 0.45) txt = 'Biraz erken';
      else if (offsetMs > tol * 0.45) txt = 'Biraz geç';
    }
    feedback(txt, 'good');
    updateHud();
  }

  function markMiss(ev) {
    ev.state = 'miss';
    streakN = 0;
    const st = input.state;
    let txt = 'Kaçtı';
    if (ev.notes.length === 1 && st.midi != null) {
      const diff = st.midi - ev.notes[0].midi;
      if (diff !== 0 && Math.abs(diff) <= 4) txt = diff > 0 ? `${diff} perde yüksek` : `${-diff} perde alçak`;
    }
    feedback(txt, 'bad');
    updateHud();
  }

  function feedback(text, cls) {
    const el = $('fb');
    el.textContent = text;
    el.className = 'feedback ' + cls;
    clearTimeout(fbTimer);
    fbTimer = setTimeout(() => (el.textContent = ''), 900);
  }

  function stats() {
    const evs = data ? data.events : [];
    const done = evs.filter((e) => e.state !== 'pending');
    const hits = done.filter((e) => e.state === 'hit');
    const tol = TOLERANCE[getSettings().difficulty];
    const timed = hits.filter((e) => e.offset != null);
    const perfect = timed.filter((e) => Math.abs(e.offset) <= tol * 0.45).length;
    const early = timed.filter((e) => e.offset < -tol * 0.45).length;
    const late = timed.filter((e) => e.offset > tol * 0.45).length;
    const missByBar = new Map();
    for (const e of done) if (e.state === 'miss') missByBar.set(e.barIndex, (missByBar.get(e.barIndex) || 0) + 1);
    return {
      total: evs.length, judged: done.length, hits: hits.length,
      accuracy: done.length ? Math.round((hits.length / done.length) * 100) : 0,
      fullAccuracy: evs.length ? Math.round((hits.length / evs.length) * 100) : 0,
      perfect, early, late, bestStreak, missByBar,
    };
  }

  let hudT = 0;
  function updateHud(force) {
    const now = performance.now();
    if (!force && now - hudT < 80) return;
    hudT = now;
    const st = stats();
    $('acc').textContent = st.judged ? `%${st.accuracy}` : '–';
    $('streak').textContent = String(streakN);
  }

  // ---- bitiş ----
  function onFinished() {
    if (finishedShown || !data || destroyed) return;
    const st = stats();
    if (st.judged < Math.max(3, data.events.length * 0.5)) return; // erken durdurulduysa sonuç gösterme
    if (api.isLooping) return;
    finishedShown = true;
    showResult(st);
  }

  function showResult(st) {
    const acc = st.fullAccuracy;
    const stars = acc >= 95 ? 3 : acc >= 80 ? 2 : acc >= 60 ? 1 : 0;
    const res = { accuracy: acc, stars, speed, hits: st.hits, total: st.total, bestStreak: st.bestStreak };
    opts.onResult?.(res);
    const weak = [...st.missByBar.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).sort((a, b) => a[0] - b[0]);
    const timedTotal = st.perfect + st.early + st.late;
    const pct = (n) => (timedTotal ? Math.round((n / timedTotal) * 100) : 0);
    const msg = acc >= 95 ? 'Mükemmel! Bir sonraki adıma hazırsın.' : acc >= 80 ? 'Çok iyi gidiyor.' : acc >= 60 ? 'Fena değil, biraz daha tekrar.' : 'Yavaşlatıp tekrar dene; hız sonra gelir.';
    const box = $('result');
    box.hidden = false;
    box.innerHTML = '';
    box.appendChild(h(`
      <div class="card">
        <div class="row"><div class="score">%${acc}</div><div class="spacer"></div><div class="stars">${'★'.repeat(stars)}<span class="off">${'★'.repeat(3 - stars)}</span></div></div>
        <p>${msg}</p>
        <p class="muted small">${st.hits} / ${st.total} nota doğru · en uzun seri ${st.bestStreak} · hız %${Math.round(speed * 100)}</p>
        ${timedTotal && !getSettings().waitMode ? `<p class="small">Zamanlama: %${pct(st.perfect)} tam yerinde, %${pct(st.early)} erken, %${pct(st.late)} geç</p>` : ''}
        ${weak.length ? `<div><p class="small muted" style="margin-bottom:8px">Zorlandığın yerler — tıkla, o bölümü döngüde çalış:</p><div class="weak">${weak.map(([b]) => `<button class="btn" data-bar="${b}">${b + 1}. ölçü</button>`).join('')}</div></div>` : ''}
        ${acc >= 90 && speed < 1 ? '<p class="small" style="color:var(--turq)">Bu hızda rahatsın, hızı biraz artırmayı dene.</p>' : ''}
        <div class="row">
          <button class="btn" data-x="again">Tekrar çal</button>
          ${opts.onNext ? `<button class="btn primary" data-x="next">${esc(opts.nextLabel || 'Sonraki')}</button>` : ''}
          <div class="spacer"></div>
          <button class="btn ghost" data-x="close">Kapat</button>
        </div>
      </div>`));
    box.querySelector('[data-x="again"]').onclick = () => { box.hidden = true; restart(true); };
    box.querySelector('[data-x="close"]').onclick = () => exit();
    const nx = box.querySelector('[data-x="next"]');
    if (nx) nx.onclick = () => { cleanup(); opts.onNext(); };
    box.querySelectorAll('[data-bar]').forEach((b) => (b.onclick = () => {
      box.hidden = true;
      loopBars(Number(b.dataset.bar), Number(b.dataset.bar) + 1);
    }));
  }

  function loopBars(fromBar, toBar) {
    const mbs = api.tickCache.masterBars;
    const a = mbs.find((m) => m.masterBar.index === Math.max(0, fromBar));
    const lastIdx = Math.min(score.masterBars.length - 1, toBar);
    const b = mbs.find((m) => m.masterBar.index === lastIdx);
    if (!a || !b) return;
    api.playbackRange = { startTick: a.start, endTick: b.end };
    api.isLooping = true;
    btn('loop').classList.add('on');
    if (speed > 0.75) setSpeed(0.75);
    restart(true);
    toast(`${fromBar + 1}–${lastIdx + 1}. ölçüler döngüde`);
  }

  // ---- kontroller ----
  function setSpeed(v) {
    speed = v;
    if (api) api.playbackSpeed = v;
    $('speed').textContent = `%${Math.round(v * 100)}`;
  }
  function restart(play) {
    if (!api) return;
    api.stop();
    const start = api.playbackRange ? api.playbackRange.startTick : 0;
    api.tickPosition = start;
    lastTick = start;
    lastSongMs = data ? data.tempo.tickToMs(start) : 0;
    clock.base = lastSongMs;
    clock.wall = performance.now();
    clock.moving = false;
    resetJudging(lastSongMs);
    if (play) setTimeout(() => api.play(), 60);
  }
  function togglePlay() {
    if (!api || !ready) return;
    $('result').hidden = true;
    if (waiting) {
      waiting = null;
    }
    api.playPause();
  }
  function syncToggles() {
    const c = getSettings();
    btn('wait').classList.toggle('on', c.waitMode);
    btn('guide').classList.toggle('on', c.guide);
    btn('metro').classList.toggle('on', c.metronome);
    btn('sheet').classList.toggle('on', c.showSheet);
  }

  btn('play').onclick = togglePlay;
  btn('restart').onclick = () => restart(false);
  btn('exit').onclick = () => exit();
  btn('slower').onclick = () => setSpeed(SPEEDS[Math.max(0, SPEEDS.indexOf(nearest(speed)) - 1)]);
  btn('faster').onclick = () => setSpeed(SPEEDS[Math.min(SPEEDS.length - 1, SPEEDS.indexOf(nearest(speed)) + 1)]);
  btn('wait').onclick = () => { setSetting('waitMode', !getSettings().waitMode); waiting = null; syncToggles(); };
  btn('guide').onclick = () => { setSetting('guide', !getSettings().guide); applyTrackAudio(); syncToggles(); };
  btn('metro').onclick = () => { setSetting('metronome', !getSettings().metronome); if (api) api.metronomeVolume = getSettings().metronome ? 1 : 0; syncToggles(); };
  btn('sheet').onclick = () => {
    setSetting('showSheet', !getSettings().showSheet);
    $('sheet').classList.toggle('hidden', !getSettings().showSheet);
    syncToggles();
    if (api && getSettings().showSheet) setTimeout(() => api.render(), 50);
  };
  btn('loop').onclick = () => {
    if (!api) return;
    if (api.isLooping) {
      api.isLooping = false;
      api.playbackRange = null;
      btn('loop').classList.remove('on');
      toast('Döngü kapandı');
    } else {
      api.isLooping = true;
      btn('loop').classList.add('on');
      toast(api.playbackRange ? 'Seçili bölüm döngüde' : 'Tüm şarkı döngüde. Bölüm için tabda fareyle sürükleyerek seç.');
    }
  };
  const nearest = (v) => SPEEDS.reduce((a, b) => (Math.abs(b - v) < Math.abs(a - v) ? b : a));

  function onKey(e) {
    if (e.target.closest('select, input')) return;
    if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
    else if (e.code === 'Escape') exit();
    else if (e.code === 'Home') restart(false);
    else if (e.key === '+' || e.code === 'NumpadAdd') btn('faster').click();
    else if (e.key === '-' || e.code === 'NumpadSubtract') btn('slower').click();
  }
  window.addEventListener('keydown', onKey);

  // ---- ana döngü ----
  let raf = 0;
  function frame() {
    if (destroyed) return;
    const now = performance.now();
    const dt = (now - lastFrame) / 1000;
    lastFrame = now;
    if (playing && !waiting) practiceAcc += dt;
    const songMs = songMsNow(now);
    if (ready && (playing || waiting)) judge(now, songMs);
    highway.pxPerMs = getSettings().zoom;
    highway.draw(songMs, now);
    if (data) {
      const nxt = waiting || data.events.find((e, k) => k >= judgeIdx && e.state === 'pending' && e.ms >= songMs - 400) || null;
      const ni = nxt ? data.events.indexOf(nxt) : -1;
      fret.show(nxt, ni >= 0 ? data.events.slice(ni + 1, ni + 3) : []);
    }
    const st = input.state;
    $('heard').textContent = st.midi != null ? noteLabel(st.midi) : '–';
    $('inputWarn').hidden = input.running;
    if (practiceAcc >= 15) {
      addPracticeSeconds(Math.round(practiceAcc));
      practiceAcc = 0;
    }
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);

  function cleanup() {
    if (destroyed) return;
    destroyed = true;
    cancelAnimationFrame(raf);
    window.removeEventListener('keydown', onKey);
    addPracticeSeconds(Math.round(practiceAcc));
    highway.destroy();
    try { api?.destroy(); } catch { /* yok say */ }
  }
  function exit() {
    cleanup();
    opts.onExit?.();
  }

  // Otomatik testler için okuma kancası (uygulamada bir etkisi yok)
  window.__practice = {
    get events() { return data ? data.events : []; },
    get playing() { return playing; },
    get ready() { return ready; },
    get speed() { return speed; },
    songMs: () => songMsNow(performance.now()),
    stats: () => stats(),
    play: () => togglePlay(),
  };

  setSpeed(1);
  syncToggles();
  load();
  return { destroy: cleanup };
}
