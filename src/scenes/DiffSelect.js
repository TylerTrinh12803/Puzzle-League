import { GAME_W, GAME_H, DIFFS } from '../constants.js';
import { makeButton, bigText, smallText, gradientBg } from '../ui.js';

const MODE_LABELS = { Versus: '⚔ STORY', PvP: '🎮 PVP', Endless: '∞ ENDLESS' };

export class DiffSelect extends Phaser.Scene {
  constructor() { super('DiffSelect'); }

  init(data) {
    this.target = data.target || 'Endless';
  }

  create() {
    gradientBg(this, GAME_W, GAME_H, 0x141040, 0x060414);

    bigText(this, GAME_W / 2, 150, MODE_LABELS[this.target] || this.target, 54, '#ffd94a');
    bigText(this, GAME_W / 2, 240, 'SELECT DIFFICULTY', 42);
    smallText(this, GAME_W / 2, 300, this.target === 'PvP'
      ? 'Sets how fast both stacks rise'
      : 'Sets stack speed and how fast rivals play', 24);

    let saved = 0;
    try { saved = parseInt(localStorage.getItem('pl_diff') || '0', 10) || 0; } catch (e) {}

    DIFFS.forEach((d, i) => {
      const y = 400 + i * 118;
      const rowsPerMin = Math.round(60000 / d.rise);
      const btn = makeButton(this, GAME_W / 2, y, 480, 96,
        `${d.name}`, () => {
          this.registry.set('difficulty', i);
          try { localStorage.setItem('pl_diff', String(i)); } catch (e) {}
          this.scene.start(this.target);
        }, { color: 0x1c1840, stroke: d.color, fontSize: 38 });
      smallText(this, GAME_W / 2 + 150, y, `${rowsPerMin} rows/min`, 20, '#9d9ac4');
      if (i === saved) smallText(this, GAME_W / 2 - 280, y, '▶', 30, '#ffd94a');
    });

    makeButton(this, GAME_W / 2, GAME_H - 90, 300, 80, '← BACK', () => {
      this.scene.start('Menu');
    }, { fontSize: 30 });
  }
}
