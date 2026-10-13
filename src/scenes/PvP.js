import { GAME_W, GAME_H, DIFFS, UI } from '../constants.js';
import { Board } from '../Board.js';
import { comboGarbage, chainGarbage } from '../rivals.js';
import { makeButton, bigText, smallText, panelBg, gradientBg, initialsEntry, musicToggle } from '../ui.js';
import { qualifies, addScore } from '../leaderboard.js';
import { sfx } from '../audio.js';
import { music } from '../music.js';

const CELL = 57;
const WINS_NEEDED = 2;

export class PvP extends Phaser.Scene {
  constructor() { super('PvP'); }

  create() {
    gradientBg(this, GAME_W, GAME_H, 0x0f1a3a, 0x050310);

    this.diffIdx = this.registry.get('difficulty') ?? 0;
    this.diff = DIFFS[this.diffIdx];
    this.wins = [0, 0];
    this.totals = [0, 0];
    this.roundNum = 1;
    this.roundActive = false;
    this.boards = null;

    this.buildHud();
    this.buildRaiseButtons();
    this.setupKeyboard();
    musicToggle(this, GAME_W / 2, 250, 32);
    music.play('battle');
    this.startRound();
  }

  // ------------------------------------------------------------------ HUD
  buildHud() {
    panelBg(this, GAME_W / 2, 100, GAME_W - 20, 180);
    bigText(this, 190, 55, 'PLAYER 1', 36, '#7fd486');
    bigText(this, GAME_W - 190, 55, 'PLAYER 2', 36, '#f3a712');
    this.starTexts = [
      bigText(this, 190, 115, '', 40, '#ffd94a'),
      bigText(this, GAME_W - 190, 115, '', 40, '#ffd94a')
    ];
    const dName = this.diff.name;
    this.roundText = bigText(this, GAME_W / 2, 165, `ROUND 1 • ${dName} • first to ${WINS_NEEDED}`, 24);
    smallText(this, 190, 250, 'WASD • F swap • G raise', 20, '#9d9ac4');
    smallText(this, GAME_W - 190, 250, 'Arrows • K swap • L raise', 20, '#9d9ac4');
    this.refreshStars();
  }

  refreshStars() {
    for (let i = 0; i < 2; i++) {
      this.starTexts[i].setText('★'.repeat(this.wins[i]) + '☆'.repeat(WINS_NEEDED - this.wins[i]));
    }
  }

  // ------------------------------------------------------------------ boards
  makeBoards() {
    if (this.boards) this.boards.forEach(b => b.destroy());
    const w = 6 * CELL;
    const y = 300;
    const common = {
      y, cell: CELL,
      riseInterval: this.diff.rise,
      startRows: 5,
      graceMs: 2200
    };
    const p1 = new Board(this, {
      ...common, x: 14,
      cursorTint: 0x9fffab,
      onGameOver: () => this.endRound(1),
      onAttack: (a) => this.sendAttack(a, 1)
    });
    const p2 = new Board(this, {
      ...common, x: GAME_W - w - 14,
      cursorTint: 0xffe08a,
      onGameOver: () => this.endRound(0),
      onAttack: (a) => this.sendAttack(a, 0)
    });
    this.boards = [p1, p2];
    p1.setPaused(true);
    p2.setPaused(true);
  }

  sendAttack(attack, targetIdx) {
    if (!this.roundActive) return;
    const list = attack.type === 'combo' ? comboGarbage(attack.size) : chainGarbage(attack.level);
    if (!list.length) return;
    const from = this.boards[1 - targetIdx];
    const to = this.boards[targetIdx];
    for (const g of list) to.queueGarbage(g.w, g.h);
    const p = this.add.text(from.x + from.w / 2, from.y + 80, '💢', { fontSize: '40px' })
      .setOrigin(0.5).setDepth(150);
    this.tweens.add({
      targets: p, x: to.x + to.w / 2, y: to.y + 60,
      duration: 380, ease: 'Quad.in',
      onComplete: () => p.destroy()
    });
  }

  // ------------------------------------------------------------------ flow
  startRound() {
    this.makeBoards();
    this.refreshStars();
    this.roundText.setText(`ROUND ${this.roundNum} • ${this.diff.name} • first to ${WINS_NEEDED}`);

    ['3', '2', '1', 'GO!'].forEach((n, i) => {
      this.time.delayedCall(650 * i, () => {
        const t = bigText(this, GAME_W / 2, GAME_H / 2, n, 140, n === 'GO!' ? '#7fd486' : '#ffd94a').setDepth(300);
        sfx.cursor();
        this.tweens.add({ targets: t, scale: 1.6, alpha: 0, duration: 600, onComplete: () => t.destroy() });
        if (n === 'GO!') {
          this.boards.forEach(b => b.setPaused(false));
          this.roundActive = true;
          sfx.combo();
        }
      });
    });
  }

  endRound(winnerIdx) {
    if (!this.roundActive) return;
    this.roundActive = false;
    this.boards.forEach((b, i) => { this.totals[i] += b.score; b.setPaused(true); b.over = true; });
    this.wins[winnerIdx]++;
    this.refreshStars();
    sfx.win();

    const msg = `PLAYER ${winnerIdx + 1}\nWINS ROUND ${this.roundNum}!`;
    const color = winnerIdx === 0 ? '#7fd486' : '#f3a712';
    const t = bigText(this, GAME_W / 2, GAME_H / 2 - 40, msg, 56, color).setDepth(300);

    this.time.delayedCall(2000, () => {
      t.destroy();
      if (this.wins[winnerIdx] >= WINS_NEEDED) this.matchEnd(winnerIdx);
      else {
        this.roundNum++;
        this.startRound();
      }
    });
  }

  matchEnd(winnerIdx) {
    music.stop();
    const score = this.totals[winnerIdx];
    if (qualifies('pvp', this.diffIdx, score)) {
      const ui = this.add.container(0, 0).setDepth(350);
      ui.add(this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x000000, 0.8).setInteractive());
      ui.add(panelBg(this, GAME_W / 2, GAME_H / 2 + 20, 620, 760));
      ui.add(bigText(this, GAME_W / 2, GAME_H / 2 - 300, '🏆 HIGH SCORE! 🏆', 46, '#ffd94a'));
      ui.add(bigText(this, GAME_W / 2, GAME_H / 2 - 228,
        `PLAYER ${winnerIdx + 1}: ${score}`, 42, winnerIdx === 0 ? '#7fd486' : '#f3a712'));
      ui.add(smallText(this, GAME_W / 2, GAME_H / 2 - 165, 'Winner, enter your initials:', 28));
      ui.add(initialsEntry(this, GAME_W / 2, GAME_H / 2 - 80, (name) => {
        const rank = addScore('pvp', this.diffIdx, name, score);
        ui.destroy();
        this.showMatchPanel(winnerIdx, rank);
      }));
      sfx.win();
      return;
    }
    this.showMatchPanel(winnerIdx, null);
  }

  showMatchPanel(winnerIdx, rank) {
    const ui = this.add.container(0, 0).setDepth(300);
    ui.add(this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x000000, 0.78).setInteractive());
    ui.add(panelBg(this, GAME_W / 2, GAME_H / 2, 600, 560));
    ui.add(bigText(this, GAME_W / 2, GAME_H / 2 - 180, '🏆 VICTORY 🏆', 54, '#ffd94a'));
    ui.add(bigText(this, GAME_W / 2, GAME_H / 2 - 80, `PLAYER ${winnerIdx + 1}`, 72,
      winnerIdx === 0 ? '#7fd486' : '#f3a712'));
    ui.add(smallText(this, GAME_W / 2, GAME_H / 2 - 10, `wins ${this.wins[winnerIdx]} – ${this.wins[1 - winnerIdx]}`, 30));
    ui.add(smallText(this, GAME_W / 2, GAME_H / 2 + 35,
      rank ? `Score ${this.totals[winnerIdx]} — Rank #${rank} on the PVP board!` : `Score: ${this.totals[winnerIdx]}`,
      24, rank ? '#ffd94a' : '#c9c6ef'));
    sfx.win();
    ui.add(makeButton(this, GAME_W / 2, GAME_H / 2 + 100, 440, 95, 'REMATCH', () => {
      this.scene.restart();
    }, { color: 0x1f5e35, stroke: 0x43aa4b, fontSize: 38 }));
    ui.add(makeButton(this, GAME_W / 2, GAME_H / 2 + 215, 440, 90, 'MENU', () => this.scene.start('Menu')));
  }

  // ------------------------------------------------------------------ controls
  buildRaiseButtons() {
    const mk = (x, idx, color) => {
      const c = this.add.container(x, GAME_H - 130).setDepth(100);
      const bg = this.add.circle(0, 0, 54, color, 0.9).setStrokeStyle(4, 0xffffff);
      const label = this.add.text(0, 0, '⬆\nRAISE', {
        fontFamily: UI.font, fontSize: '18px', color: '#fff', align: 'center'
      }).setOrigin(0.5);
      c.add([bg, label]);
      c.setSize(108, 108).setInteractive();
      c.on('pointerdown', () => {
        sfx.ensure();
        if (this.boards && this.roundActive) this.boards[idx].forceRaise(true);
        bg.setAlpha(1);
      });
      const off = () => {
        if (this.boards) this.boards[idx].forceRaise(false);
        bg.setAlpha(0.9);
      };
      c.on('pointerup', off);
      c.on('pointerout', off);
    };
    mk(80, 0, 0x2e7d3e);
    mk(GAME_W - 80, 1, 0xb07716);
  }

  setupKeyboard() {
    const k = this.input.keyboard;
    if (!k) return;
    const b = (i) => this.boards && this.roundActive ? this.boards[i] : null;
    // player 1: WASD + F/G
    k.on('keydown-A', () => b(0) && b(0).moveCursor(0, -1));
    k.on('keydown-D', () => b(0) && b(0).moveCursor(0, 1));
    k.on('keydown-W', () => b(0) && b(0).moveCursor(1, 0));
    k.on('keydown-S', () => b(0) && b(0).moveCursor(-1, 0));
    k.on('keydown-F', () => b(0) && b(0).swapAtCursor());
    k.on('keydown-G', () => b(0) && b(0).forceRaise(true));
    k.on('keyup-G', () => b(0) && b(0).forceRaise(false));
    // player 2: arrows + K/L
    k.on('keydown-LEFT', () => b(1) && b(1).moveCursor(0, -1));
    k.on('keydown-RIGHT', () => b(1) && b(1).moveCursor(0, 1));
    k.on('keydown-UP', () => b(1) && b(1).moveCursor(1, 0));
    k.on('keydown-DOWN', () => b(1) && b(1).moveCursor(-1, 0));
    k.on('keydown-K', () => b(1) && b(1).swapAtCursor());
    k.on('keydown-L', () => b(1) && b(1).forceRaise(true));
    k.on('keyup-L', () => b(1) && b(1).forceRaise(false));
    k.on('keydown-ESC', () => this.scene.start('Menu'));
  }

  update(_, dtRaw) {
    const dt = Math.min(dtRaw, 50);
    if (!this.boards) return;
    this.boards.forEach(b => b.update(dt));
  }
}
