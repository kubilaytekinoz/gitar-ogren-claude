// Gitar girişi: Blackstar ID:Core (USB) ya da başka bir ses kartı.
// Sürekli dinler; her ~12 ms'de bir "şu an duyulan nota" bilgisini günceller.
import { detectPitch, freqToMidi, spectrum, rms } from './pitch.js';

const FRAME = 16384; // akorlar için uzun pencere
const PITCH_FRAME = 4096; // tek nota için kısa pencere
const LOOP_MS = 12;

class AudioInput extends EventTarget {
  constructor() {
    super();
    this.ctx = null;
    this.stream = null;
    this.analyser = null;
    this.gainNode = null;
    this.deviceId = null;
    this.deviceLabel = '';
    this.gain = 1;
    this.buf = new Float32Array(FRAME);
    this.timer = null;
    this.state = { midi: null, freq: 0, cents: 0, clarity: 0, rms: 0, level: 0, time: 0 };
    this.lastAttack = 0; // son tel vuruşunun zamanı (performance.now)
    this.lastPitchChange = 0;
    this._rmsHist = [];
    this._specCache = null;
    this._lastRounded = null;
  }

  get running() {
    return !!this.stream;
  }

  async listDevices() {
    try {
      // Etiketlerin görünmesi için bir kez izin almak gerekir
      if (!this.stream) {
        const tmp = await navigator.mediaDevices.getUserMedia({ audio: true });
        tmp.getTracks().forEach((t) => t.stop());
      }
    } catch {
      /* izin yoksa yine de listele */
    }
    const all = await navigator.mediaDevices.enumerateDevices();
    return all.filter((d) => d.kind === 'audioinput').map((d) => ({ id: d.deviceId, label: d.label || 'Ses girişi' }));
  }

  /** Listeden Blackstar'ı (yoksa varsayılanı) önerir. */
  pickBest(devices) {
    return (
      devices.find((d) => /blackstar|id:?\s*core/i.test(d.label)) ||
      devices.find((d) => /guitar|gitar|usb audio|line/i.test(d.label)) ||
      devices.find((d) => d.id === 'default') ||
      devices[0] ||
      null
    );
  }

  async start(deviceId) {
    await this.stop();
    const constraints = {
      audio: {
        deviceId: deviceId ? { exact: deviceId } : undefined,
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        channelCount: { ideal: 2 },
        latency: { ideal: 0.005 },
      },
      video: false,
    };
    this.stream = await navigator.mediaDevices.getUserMedia(constraints);
    const track = this.stream.getAudioTracks()[0];
    this.deviceId = track.getSettings().deviceId || deviceId || null;
    this.deviceLabel = track.label;
    this.ctx = new AudioContext({ latencyHint: 'interactive' });
    const src = this.ctx.createMediaStreamSource(this.stream);
    this.gainNode = this.ctx.createGain();
    this.gainNode.gain.value = this.gain;
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = FRAME;
    this.analyser.smoothingTimeConstant = 0;
    src.connect(this.gainNode).connect(this.analyser);
    // Grafiğin her koşulda işlenmesi için sessiz bir çıkışa bağla (hoparlöre ses gitmez)
    const mute = this.ctx.createGain();
    mute.gain.value = 0;
    this.analyser.connect(mute).connect(this.ctx.destination);
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    track.addEventListener('ended', () => {
      this.dispatchEvent(new Event('lost'));
      this.stop();
    });
    this.timer = setInterval(() => this._tick(), LOOP_MS);
    this.dispatchEvent(new Event('change'));
    return { id: this.deviceId, label: this.deviceLabel };
  }

  async stop() {
    clearInterval(this.timer);
    this.timer = null;
    if (this.stream) this.stream.getTracks().forEach((t) => t.stop());
    this.stream = null;
    if (this.ctx) await this.ctx.close().catch(() => {});
    this.ctx = null;
    this.analyser = null;
    this.state = { midi: null, freq: 0, cents: 0, clarity: 0, rms: 0, level: 0, time: performance.now() };
    this.dispatchEvent(new Event('change'));
  }

  setGain(g) {
    this.gain = g;
    if (this.gainNode) this.gainNode.gain.value = g;
  }

  _tick() {
    if (!this.analyser) return;
    this.analyser.getFloatTimeDomainData(this.buf);
    this._specCache = null;
    const now = performance.now();
    const sr = this.ctx.sampleRate;
    const short = this.buf.subarray(FRAME - 1024);
    const r = rms(short);

    // vuruş (atak) algılama: ses seviyesi kısa sürede belirgin artarsa
    this._rmsHist.push(r);
    if (this._rmsHist.length > 10) this._rmsHist.shift();
    const minRecent = Math.min(...this._rmsHist.slice(0, -1));
    const rising = r > (this._prevR ?? 0) * 1.12;
    if (r > 0.006 && rising && r > minRecent * 1.45 + 0.002 && now - this.lastAttack > 100) {
      this.lastAttack = now;
    }
    this._prevR = r;

    // Yeni bir vuruştan hemen sonra yalnızca vuruş sonrası sesi kullan: önceki
    // notanın çınlaması yeni notanın perdesini karıştırmasın.
    const sinceAttack = Math.round(((now - this.lastAttack) / 1000) * sr) + 256;
    const n = Math.min(PITCH_FRAME, sinceAttack);
    const p = n >= 1536 ? detectPitch(this.buf.subarray(FRAME - n), sr) : null;
    let midi = null, cents = 0, freq = 0, clarity = 0;
    if (p) {
      freq = p.freq;
      clarity = p.clarity;
      const mf = freqToMidi(freq);
      midi = Math.round(mf);
      cents = (mf - midi) * 100;
      if (midi !== this._lastRounded) this.lastPitchChange = now;
    }
    this._lastRounded = midi;
    const level = Math.min(1, Math.sqrt(r) * 2.2);
    this.state = { midi, freq, cents, clarity, rms: r, level, time: now };
    this.dispatchEvent(new Event('frame'));
  }

  /** Akor kontrolü için spektrum (her döngüde en fazla bir kez hesaplanır). */
  getSpectrum() {
    if (!this.analyser) return null;
    if (!this._specCache) this._specCache = spectrum(this.buf, this.ctx.sampleRate);
    return this._specCache;
  }

  /** Son tel vuruşundan bu yana gelen ses örnekleri (akor kontrolü için). */
  postAttack(now = performance.now()) {
    if (!this.analyser) return null;
    const sr = this.ctx.sampleRate;
    // vuruş, son 1024 örneklik pencerede fark edildiği için biraz geriden başla
    const n = Math.min(8192, Math.round(((now - this.lastAttack) / 1000) * sr) + 1024);
    return this.buf.subarray(FRAME - n);
  }

  get sampleRate() {
    return this.ctx ? this.ctx.sampleRate : 48000;
  }
}

export const input = new AudioInput();
