// Tiny WebAudio synth so we don't need any sound asset files.
class Sfx {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  ensure() {
    if (!this.enabled) return false;
    if (!this.ctx) {
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AC();
      } catch (e) {
        this.enabled = false;
        return false;
      }
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return true;
  }

  tone(freq, dur = 0.08, type = 'square', vol = 0.12, slide = 0, delay = 0) {
    if (!this.ensure()) return;
    try {
      const t0 = this.ctx.currentTime + delay;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      if (slide) osc.frequency.linearRampToValueAtTime(Math.max(40, freq + slide), t0 + dur);
      gain.gain.setValueAtTime(vol, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      osc.connect(gain).connect(this.ctx.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    } catch (e) { /* ignore */ }
  }

  swap()        { this.tone(240, 0.045, 'square', 0.07); }
  land()        { this.tone(130, 0.05, 'triangle', 0.1); }
  pop(i)        { this.tone(430 + i * 55, 0.08, 'triangle', 0.16); }
  chain(level)  { this.tone(480 + level * 110, 0.22, 'sawtooth', 0.16, 260); }
  combo()       { this.tone(390, 0.16, 'square', 0.14, 180); }
  garbage()     { this.tone(110, 0.22, 'sawtooth', 0.18, -50); }
  cursor()      { this.tone(700, 0.025, 'square', 0.04); }
  danger()      { this.tone(180, 0.1, 'sawtooth', 0.1, -40); }
  win()         { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.18, 'triangle', 0.16, 0, i * 0.13)); }
  lose()        { [392, 330, 262, 196].forEach((f, i) => this.tone(f, 0.2, 'sawtooth', 0.12, -20, i * 0.16)); }
  ko()          { this.tone(300, 0.3, 'sawtooth', 0.18, -220); }
}

export const sfx = new Sfx();
