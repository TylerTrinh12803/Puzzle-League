import { GAME_W, GAME_H, DIFFS, UI } from '../constants.js';
import { makeButton, bigText, smallText, panelBg, gradientBg } from '../ui.js';
import { getScores, LB_MODES } from '../leaderboard.js';
import { sfx } from '../audio.js';

export class Leaderboard extends Phaser.Scene {
  constructor() { super('Leaderboard'); }

  init(data) {
    this.modeIdx = Math.max(0, LB_MODES.findIndex(m => m.key === (data.mode || 'endless')));
    this.diffIdx = data.diff ?? this.registry.get('difficulty') ?? 0;
  }

  create() {
    gradientBg(this, GAME_W, GAME_H, 0x141040, 0x060414);
    bigText(this, GAME_W / 2, 110, '🏆 LEADERBOARDS', 54, '#ffd94a');
    smallText(this, GAME_W / 2, 172, 'Top 8 for every mode and difficulty', 24);

    // mode tabs
    this.tabs = LB_MODES.map((m, i) => {
      const x = GAME_W / 2 + (i - 1) * 225;
      const bg = this.add.rectangle(x, 250, 210, 74, 0x2b2660).setStrokeStyle(3, 0x6a63c9)
        .setInteractive({ useHandCursor: true });
      const t = this.add.text(x, 250, m.label, {
        fontFamily: UI.font, fontSize: '24px', color: '#ffffff'
      }).setOrigin(0.5);
      bg.on('pointerdown', () => { sfx.cursor(); this.modeIdx = i; this.refresh(); });
      return { bg, t };
    });

    // difficulty switcher
    const l = this.add.text(GAME_W / 2 - 240, 350, '◀', { fontFamily: UI.font, fontSize: '48px', color: '#ffffff' })
      .setOrigin(0.5).setInteractive({ useHandCursor: true }).setPadding(18);
    const r = this.add.text(GAME_W / 2 + 240, 350, '▶', { fontFamily: UI.font, fontSize: '48px', color: '#ffffff' })
      .setOrigin(0.5).setInteractive({ useHandCursor: true }).setPadding(18);
    this.diffText = bigText(this, GAME_W / 2, 350, '', 44);
    l.on('pointerdown', () => { sfx.cursor(); this.switchDiff(-1); });
    r.on('pointerdown', () => { sfx.cursor(); this.switchDiff(1); });

    panelBg(this, GAME_W / 2, 740, 580, 620);
    this.rows = [];
    for (let i = 0; i < 8; i++) {
      const y = 500 + i * 71;
      const rank = bigText(this, GAME_W / 2 - 225, y, `${i + 1}.`, 32, '#9d9ac4');
      const name = bigText(this, GAME_W / 2 - 90, y, '---', 32);
      const score = bigText(this, GAME_W / 2 + 155, y, '', 32, '#ffd94a');
      this.rows.push({ rank, name, score });
    }

    makeButton(this, GAME_W / 2, GAME_H - 105, 340, 88, '← MENU', () => {
      this.scene.start('Menu');
    }, { fontSize: 34 });

    this.refresh();
  }

  switchDiff(d) {
    this.diffIdx = (this.diffIdx + d + DIFFS.length) % DIFFS.length;
    this.refresh();
  }

  refresh() {
    this.tabs.forEach((tab, i) => {
      const on = i === this.modeIdx;
      tab.bg.setFillStyle(on ? 0x4a3f8f : 0x2b2660);
      tab.bg.setStrokeStyle(3, on ? 0xffd94a : 0x6a63c9);
      tab.t.setColor(on ? '#ffd94a' : '#c9c6ef');
    });

    const diff = DIFFS[this.diffIdx];
    this.diffText.setText(diff.name);
    this.diffText.setColor('#' + diff.color.toString(16).padStart(6, '0'));

    const scores = getScores(LB_MODES[this.modeIdx].key, this.diffIdx);
    this.rows.forEach((row, i) => {
      const e = scores[i];
      row.name.setText(e ? e.name : '---');
      row.score.setText(e ? String(e.score) : '');
      row.name.setAlpha(e ? 1 : 0.35);
    });
  }
}
