import { sfx } from './audio.js';

// ------------------------------------------------------------------
// Chiptune music engine: everything is synthesized live with WebAudio,
// so no audio files are needed. All three tracks are original tunes.
// Grid = eighth notes. Token format: "C5" or "C5:2" (2 eighths), "R" rest.
// ------------------------------------------------------------------

const NOTE_IDX = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };

function freq(token) {
  const m = /^([A-G]#?)(\d)$/.exec(token);
  if (!m) return 0;
  const midi = NOTE_IDX[m[1]] + (parseInt(m[2], 10) + 1) * 12;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// expand "E5 G5 C6:2 ..." into a flat step array of {f, len} | null
function seq(str) {
  const out = [];
  for (const tok of str.trim().split(/\s+/)) {
    const [note, lenStr] = tok.split(':');
    const len = lenStr ? parseInt(lenStr, 10) : 1;
    if (note === 'R') {
      for (let i = 0; i < len; i++) out.push(null);
    } else {
      out.push({ f: freq(note), len });
      for (let i = 1; i < len; i++) out.push(null);
    }
  }
  return out;
}

// drum lane: string of k(ick) s(nare) h(at) . per step
function drums(str) {
  return str.replace(/\s+/g, '').split('');
}

// ------------------------------------------------------------------ songs

// MENU — bouncy and sunny (C major)
const MENU = {
  bpm: 112,
  lead: seq(`
    E5 G5 C6:2 G5 E5 C5:2
    C5 E5 A5:2 E5 C5 A4:2
    A4 C5 F5:2 C5 A4 F4:2
    B4 D5 G5:2 D5 B4 G4:2
    E5 G5 C6:2 B5 A5 G5:2
    A5 G5 E5:2 C5 D5 E5:2
    F5:2 A5:2 G5:2 B5:2
    C6:4 R:4`),
  arp: seq(`
    C4 E4 G4 E4 C4 E4 G4 E4
    A3 C4 E4 C4 A3 C4 E4 C4
    F3 A3 C4 A3 F3 A3 C4 A3
    G3 B3 D4 B3 G3 B3 D4 B3
    C4 E4 G4 E4 C4 E4 G4 E4
    A3 C4 E4 C4 A3 C4 E4 C4
    F3 A3 C4 A3 G3 B3 D4 B3
    C4 E4 G4 C5 E5:4`),
  bass: seq(`
    C3:2 G2:2 C3:2 G2:2
    A2:2 E3:2 A2:2 E3:2
    F2:2 C3:2 F2:2 C3:2
    G2:2 D3:2 G2:2 D3:2
    C3:2 G2:2 C3:2 G2:2
    A2:2 E3:2 A2:2 E3:2
    F2:2 C3:2 G2:2 D3:2
    C3:2 G2:2 C3:4`),
  drum: drums('k.h.s.h.'.repeat(7) + 'k.h.s.s.')
};

// GAME — driving endless groove (A minor)
const GAME = {
  bpm: 138,
  lead: seq(`
    A4 C5 E5 C5 A4 C5 E5 G5
    A5:2 G5 E5 C5:2 D5 E5
    F5 A5 C6:2 A5 F5 C5:2
    G5 B5 D6:2 B5 G5 D5:2
    A4 C5 E5 C5 A4 C5 E5 C5
    E5 D5 C5 D5 E5:2 G5:2
    F5 E5 F5 A5 G5 F5 E5 D5
    E5:2 B4:2 E5:4`),
  arp: seq(`
    A3 C4 E4 C4 A3 C4 E4 C4
    A3 C4 E4 C4 A3 C4 E4 C4
    F3 A3 C4 A3 F3 A3 C4 A3
    G3 B3 D4 B3 G3 B3 D4 B3
    A3 C4 E4 C4 A3 C4 E4 C4
    A3 C4 E4 C4 A3 C4 E4 C4
    F3 A3 C4 A3 F3 A3 C4 A3
    E3 G#3 B3 G#3 E3 G#3 B3 G#3`),
  bass: seq(`
    A2 A3 A2 A3 A2 A3 A2 A3
    A2 A3 A2 A3 A2 A3 A2 A3
    F2 F3 F2 F3 F2 F3 F2 F3
    G2 G3 G2 G3 G2 G3 G2 G3
    A2 A3 A2 A3 A2 A3 A2 A3
    A2 A3 A2 A3 A2 A3 A2 A3
    F2 F3 F2 F3 F2 F3 F2 F3
    E2 E3 E2 E3 E2 E3 E2 E3`),
  drum: drums('khshkhsh'.repeat(8))
};

// BATTLE — tense rival fight (E minor)
const BATTLE = {
  bpm: 150,
  lead: seq(`
    E5:2 G5 F#5 E5 D5 E5:2
    G5:2 A5 G5 F#5 E5 D5:2
    C5 E5 G5:2 E5 C5 G4:2
    D5 F#5 A5:2 F#5 D5 A4:2
    E5 G5 B5:2 G5 E5 B4:2
    C6 B5 A5 G5 F#5 G5 A5 F#5
    C5 E5 G5 E5 D5 F#5 A5 F#5
    E5:2 E5 D5 E5:4`),
  arp: seq(`
    E3 G3 B3 G3 E3 G3 B3 G3
    E3 G3 B3 G3 E3 G3 B3 G3
    C3 E3 G3 E3 C3 E3 G3 E3
    D3 F#3 A3 F#3 D3 F#3 A3 F#3
    E3 G3 B3 G3 E3 G3 B3 G3
    E3 G3 B3 G3 E3 G3 B3 G3
    C3 E3 G3 E3 D3 F#3 A3 F#3
    E3 G3 B3 G3 E3 B3 E4 B3`),
  bass: seq(`
    E2 E3 E2 E3 E2 E3 E2 E3
    E2 E3 E2 E3 E2 E3 E2 E3
    C3 C4 C3 C4 C3 C4 C3 C4
    D3 D4 D3 D4 D3 D4 D3 D4
    E2 E3 E2 E3 E2 E3 E2 E3
    E2 E3 E2 E3 E2 E3 E2 E3
    C3 C4 C3 C4 D3 D4 D3 D4
    E2 E3 E2 E3 E2 E3 E2 E3`),
  drum: drums('khshkhsh'.repeat(7) + 'khshksss')
};

const SONGS = { menu: MENU, game: GAME, battle: BATTLE };

// ------------------------------------------------------------------ player

class Music {
  constructor() {
    this.current = null;
    this.timer = null;
    this.step = 0;
    this.nextTime = 0;
    this.gain = null;
    this.noiseBuf = null;
    let m = false;
    try { m = localStorage.getItem('pl_music') === 'off'; } catch (e) {}
    this.muted = m;
  }

  ctx() {
    sfx.ensure();
    return sfx.ctx;
  }

  ensureGraph() {
    const ctx = this.ctx();
    if (!ctx) return null;
    if (!this.gain) {
      this.gain = ctx.createGain();
      this.gain.gain.value = this.muted ? 0 : 1;
      this.gain.connect(ctx.destination);
      const len = Math.floor(ctx.sampleRate * 0.25);
      this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    return ctx;
  }

  play(name) {
    if (this.current === name && this.timer) return;
    this.stop();
    this.current = name;
    this.song = SONGS[name];
    this.step = 0;
    this.nextTime = 0;
    this.timer = setInterval(() => this.tick(), 30);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.current = null;
    this.nextTime = 0;
  }

  setMuted(m) {
    this.muted = m;
    try { localStorage.setItem('pl_music', m ? 'off' : 'on'); } catch (e) {}
    if (this.gain) {
      const ctx = this.ctx();
      this.gain.gain.setTargetAtTime(m ? 0 : 1, ctx.currentTime, 0.02);
    }
  }

  toggle() { this.setMuted(!this.muted); return this.muted; }

  tick() {
    const ctx = this.ensureGraph();
    if (!ctx || ctx.state !== 'running' || !this.song) return;
    const stepDur = 60 / (this.song.bpm * 2); // eighth notes
    if (!this.nextTime || this.nextTime < ctx.currentTime - 0.25) {
      this.nextTime = ctx.currentTime + 0.06;
    }
    while (this.nextTime < ctx.currentTime + 0.14) {
      this.scheduleStep(this.step, this.nextTime, stepDur);
      this.step = (this.step + 1) % this.song.lead.length;
      this.nextTime += stepDur;
    }
  }

  scheduleStep(i, t, dur) {
    const s = this.song;
    const lead = s.lead[i];
    if (lead) this.voice(lead.f, t, dur * lead.len, 'square', 0.042, true);
    const arp = s.arp[i % s.arp.length];
    if (arp) this.voice(arp.f, t, dur * arp.len * 0.9, 'square', 0.016);
    const bass = s.bass[i % s.bass.length];
    if (bass) this.voice(bass.f, t, dur * bass.len * 0.9, 'triangle', 0.085);
    const d = s.drum[i % s.drum.length];
    if (d === 'k') this.kick(t);
    else if (d === 's') this.snare(t);
    else if (d === 'h') this.hat(t);
    // light hat under kicks/snares for drive
    if (d === 'k' || d === 's') this.hat(t, 0.35);
  }

  voice(f, t, len, type, vol, decay = false) {
    const ctx = this.ctx();
    try {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(f, t);
      const gate = Math.max(0.05, len * 0.86);
      g.gain.setValueAtTime(vol, t);
      if (decay) g.gain.exponentialRampToValueAtTime(vol * 0.5, t + gate * 0.7);
      g.gain.exponentialRampToValueAtTime(0.001, t + gate);
      o.connect(g).connect(this.gain);
      o.start(t);
      o.stop(t + gate + 0.02);
    } catch (e) {}
  }

  kick(t) {
    const ctx = this.ctx();
    try {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'triangle';
      o.frequency.setValueAtTime(130, t);
      o.frequency.exponentialRampToValueAtTime(38, t + 0.09);
      g.gain.setValueAtTime(0.16, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.11);
      o.connect(g).connect(this.gain);
      o.start(t);
      o.stop(t + 0.13);
    } catch (e) {}
  }

  noise(t, dur, freqHz, vol) {
    const ctx = this.ctx();
    try {
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuf;
      const f = ctx.createBiquadFilter();
      f.type = 'highpass';
      f.frequency.value = freqHz;
      const g = ctx.createGain();
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      src.connect(f).connect(g).connect(this.gain);
      src.start(t);
      src.stop(t + dur + 0.02);
    } catch (e) {}
  }

  snare(t) { this.noise(t, 0.09, 1400, 0.05); }
  hat(t, scale = 1) { this.noise(t, 0.03, 6000, 0.022 * scale); }
}

export const music = new Music();
try { window.__music = music; } catch (e) {}
