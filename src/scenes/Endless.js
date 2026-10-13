import { GAME_W, GAME_H, UI, DIFFS } from '../constants.js';
import { Board } from '../Board.js';
import { makeButton, bigText, smallText, panelBg, gradientBg, initialsEntry, musicToggle } from '../ui.js';
import { qualifies, addScore } from '../leaderboard.js';
import { sfx } from '../audio.js';
import { music } from '../music.js';

export class Endless extends Phaser.Scene {
  constructor() { super('Endless'); }

  create() {
    gradientBg(this, GAME_W, GAME_H, 0x101336, 0x050310);

    this.diffIdx = this.registry.get('difficulty') ?? 0;
    this.diff = DIFFS[this.diffIdx];
    this.elapsed = 0;
    this.level = 1;
    this.ended = false;

    const cell = 88;
    const bx = (GAME_W - 6 * cell) / 2;
    const by = GAME_H - 12 * cell - 30;

    this.board = new Board(this, {
      x: bx, y: by, cell,
      riseInterval: this.diff.rise,
      startRows: 5,
      onGameOver: () => this.gameOver(),
      onScore: (s) => this.scoreText.setText(String(s))
    });

    // ---- HUD ----
    panelBg(this, GAME_W / 2, 80, GAME_W - 30, 130);
    smallText(this, 140, 40, 'SCORE', 24, '#9d9ac4');
    this.scoreText = bigText(this, 140, 90, '0', 52, '#ffd94a').setOrigin(0.5);
    const diffColor = '#' + this.diff.color.toString(16).padStart(6, '0');
    smallText(this, 385, 40, 'DIFFICULTY', 20, '#9d9ac4');
    bigText(this, 385, 88, this.diff.name, 30, diffColor);
    smallText(this, GAME_W - 190, 40, 'SPEED LV', 20, '#9d9ac4');
    this.levelText = bigText(this, GAME_W - 190, 88, '1', 40, '#7fd486');
    smallText(this, GAME_W - 90, 40, 'TIME', 20, '#9d9ac4');
    this.timeText = bigText(this, GAME_W - 90, 88, '0:00', 32, '#ffffff');

    this.buildRaiseButton();
    this.buildPause();
    this.setupKeyboard();
    musicToggle(this, GAME_W - 104, 148, 34);
    music.play('game');
  }

  buildRaiseButton() {
    const x = GAME_W - 78, y = GAME_H - 96;
    const c = this.add.container(x, y).setDepth(100);
    const bg = this.add.circle(0, 0, 62, 0xe4572e, 0.92).setStrokeStyle(4, 0xffffff);
    const label = this.add.text(0, 0, '⬆\nRAISE', {
      fontFamily: UI.font, fontSize: '22px', color: '#fff', align: 'center'
    }).setOrigin(0.5);
    c.add([bg, label]);
    c.setSize(124, 124).setInteractive();
    c.on('pointerdown', () => { sfx.ensure(); this.board.forceRaise(true); bg.setFillStyle(0xff7a4d); });
    const off = () => { this.board.forceRaise(false); bg.setFillStyle(0xe4572e); };
    c.on('pointerup', off);
    c.on('pointerout', off);
  }

  buildPause() {
    const btn = this.add.text(GAME_W - 40, 148, '⏸', { fontSize: '44px' })
      .setOrigin(0.5).setDepth(100).setInteractive({ useHandCursor: true });
    btn.on('pointerdown', () => this.showPause());
  }

  showPause() {
    if (this.ended || this.pauseUI) return;
    this.board.setPaused(true);
    const ui = this.add.container(0, 0).setDepth(200);
    ui.add(this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x000000, 0.6).setInteractive());
    ui.add(panelBg(this, GAME_W / 2, GAME_H / 2, 480, 420));
    ui.add(bigText(this, GAME_W / 2, GAME_H / 2 - 130, 'PAUSED', 56));
    ui.add(makeButton(this, GAME_W / 2, GAME_H / 2 - 20, 360, 90, 'RESUME', () => {
      ui.destroy(); this.pauseUI = null; this.board.setPaused(false);
    }));
    ui.add(makeButton(this, GAME_W / 2, GAME_H / 2 + 110, 360, 90, 'QUIT TO MENU', () => {
      this.scene.start('Menu');
    }, { color: 0x5a2436, stroke: 0xe4572e }));
    this.pauseUI = ui;
  }

  setupKeyboard() {
    const k = this.input.keyboard;
    if (!k) return;
    k.on('keydown-LEFT', () => this.board.moveCursor(0, -1));
    k.on('keydown-RIGHT', () => this.board.moveCursor(0, 1));
    k.on('keydown-UP', () => this.board.moveCursor(1, 0));
    k.on('keydown-DOWN', () => this.board.moveCursor(-1, 0));
    k.on('keydown-SPACE', () => this.board.swapAtCursor());
    k.on('keydown-Z', () => this.board.swapAtCursor());
    k.on('keydown-X', () => this.board.forceRaise(true));
    k.on('keyup-X', () => this.board.forceRaise(false));
    k.on('keydown-SHIFT', () => this.board.forceRaise(true));
    k.on('keyup-SHIFT', () => this.board.forceRaise(false));
    k.on('keydown-ESC', () => this.showPause());
  }

  gameOver() {
    if (this.ended) return;
    this.ended = true;
    music.stop();
    sfx.lose();
    this.cameras.main.shake(400, 0.01);

    const score = this.board.score;
    let best = this.registry.get('bestScore');
    if (score > best) {
      best = score;
      this.registry.set('bestScore', best);
      try { localStorage.setItem('pl_best', String(best)); } catch (e) {}
    }

    this.time.delayedCall(900, () => {
      if (qualifies('endless', this.diffIdx, score)) this.showNameEntry(score);
      else this.showResults(score, null);
    });
  }

  showNameEntry(score) {
    const ui = this.add.container(0, 0).setDepth(200);
    ui.add(this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x000000, 0.72).setInteractive());
    ui.add(panelBg(this, GAME_W / 2, GAME_H / 2 + 20, 620, 760));
    ui.add(bigText(this, GAME_W / 2, GAME_H / 2 - 300, '🏆 HIGH SCORE! 🏆', 48, '#ffd94a'));
    ui.add(bigText(this, GAME_W / 2, GAME_H / 2 - 225, String(score), 60, '#7fd486'));
    ui.add(smallText(this, GAME_W / 2, GAME_H / 2 - 160, 'Enter your initials:', 28));
    ui.add(initialsEntry(this, GAME_W / 2, GAME_H / 2 - 80, (name) => {
      const rank = addScore('endless', this.diffIdx, name, score);
      ui.destroy();
      this.showResults(score, rank);
    }));
    sfx.win();
  }

  showResults(score, rank) {
    const best = this.registry.get('bestScore');
    const ui = this.add.container(0, 0).setDepth(200);
    ui.add(this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x000000, 0.65).setInteractive());
    ui.add(panelBg(this, GAME_W / 2, GAME_H / 2, 560, 640));
    ui.add(bigText(this, GAME_W / 2, GAME_H / 2 - 240, 'GAME OVER', 58, '#e4572e'));
    ui.add(smallText(this, GAME_W / 2, GAME_H / 2 - 165, `SCORE (${this.diff.name})`, 24, '#9d9ac4'));
    ui.add(bigText(this, GAME_W / 2, GAME_H / 2 - 110, String(score), 62, '#ffd94a'));
    ui.add(smallText(this, GAME_W / 2, GAME_H / 2 - 45,
      rank ? `🎉 Rank #${rank} on the ${this.diff.name} leaderboard!` : `Best: ${best}`,
      26, rank ? '#7fd486' : '#c9c6ef'));
    ui.add(makeButton(this, GAME_W / 2, GAME_H / 2 + 40, 420, 85, 'PLAY AGAIN', () => {
      this.scene.restart();
    }, { color: 0x1f5e35, stroke: 0x43aa4b }));
    ui.add(makeButton(this, GAME_W / 2, GAME_H / 2 + 145, 420, 85, '🏆 LEADERBOARD', () => {
      this.scene.start('Leaderboard', { mode: 'endless', diff: this.diffIdx });
    }, { color: 0x6e5716, stroke: 0xf3a712 }));
    ui.add(makeButton(this, GAME_W / 2, GAME_H / 2 + 250, 420, 85, 'MENU', () => {
      this.scene.start('Menu');
    }));
  }

  update(_, dtRaw) {
    const dt = Math.min(dtRaw, 50);
    if (this.ended) return;
    this.elapsed += dt;

    const lvl = Math.min(20, 1 + Math.floor(this.elapsed / this.diff.levelMs));
    if (lvl !== this.level) {
      this.level = lvl;
      this.levelText.setText(String(lvl));
      this.board.riseInterval = Math.max(1100, this.diff.rise * Math.pow(this.diff.levelFactor, lvl - 1));
      sfx.combo();
    }
    const secs = Math.floor(this.elapsed / 1000);
    this.timeText.setText(`${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`);

    this.board.update(dt);
  }
}
