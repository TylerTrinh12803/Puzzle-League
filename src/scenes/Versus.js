import { GAME_W, GAME_H, UI, DIFFS } from '../constants.js';
import { Board } from '../Board.js';
import { AI } from '../AI.js';
import { RIVALS, PLAYER, comboGarbage, chainGarbage } from '../rivals.js';
import { makeButton, bigText, smallText, panelBg, gradientBg, initialsEntry, musicToggle } from '../ui.js';
import { qualifies, addScore } from '../leaderboard.js';
import { sfx } from '../audio.js';
import { music } from '../music.js';

const P_CELL = 80;   // player board cell
const O_CELL = 34;   // opponent board cell

export class Versus extends Phaser.Scene {
  constructor() { super('Versus'); }

  create() {
    gradientBg(this, GAME_W, GAME_H, 0x1b1040, 0x070312);

    this.rivalIndex = Math.min(this.registry.get('rivalProgress'), RIVALS.length - 1);
    this.rival = RIVALS[this.rivalIndex];
    this.diff = DIFFS[this.registry.get('difficulty') ?? 0];
    // stacks speed up for later rivals on top of the chosen difficulty
    this.riseMs = Math.max(1400, this.diff.rise * (1 - 0.07 * this.rivalIndex));
    this.playerWins = 0;
    this.rivalWins = 0;
    this.matchScore = 0;
    this.diffIdx = this.registry.get('difficulty') ?? 0;
    if (!this.registry.has('storyRunScore')) this.registry.set('storyRunScore', 0);
    this.roundNum = 1;
    this.roundActive = false;
    this.boards = null;

    this.buildHud();
    this.buildRaiseButton();
    this.setupKeyboard();
    musicToggle(this, GAME_W / 2, 52, 32);
    music.play('battle');
    this.showIntro();
  }

  // ------------------------------------------------------------------ HUD
  buildHud() {
    panelBg(this, GAME_W / 2, 105, GAME_W - 20, 190);

    // player side
    this.add.text(60, 50, PLAYER.emoji, { fontSize: '54px' }).setOrigin(0.5);
    smallText(this, 60, 100, 'YOU', 22, '#7fd486');
    this.playerTeamIcons = PLAYER.team.map((m, i) => {
      const t = this.add.text(140 + i * 62, 55, m.emoji, { fontSize: '40px' }).setOrigin(0.5);
      const x = this.add.text(140 + i * 62, 55, '❌', { fontSize: '34px' }).setOrigin(0.5).setVisible(false);
      return { icon: t, cross: x };
    });
    this.playerScoreText = smallText(this, 200, 105, 'Score: 0', 22, '#c9c6ef');

    // rival side
    const rx = GAME_W - 60;
    this.add.text(rx, 50, this.rival.emoji, { fontSize: '54px' }).setOrigin(0.5);
    smallText(this, rx, 100, this.rival.name.toUpperCase(), 22, '#f28f6b');
    this.rivalTeamIcons = this.rival.team.map((m, i) => {
      const t = this.add.text(rx - 80 - i * 62, 55, m.emoji, { fontSize: '40px' }).setOrigin(0.5);
      const x = this.add.text(rx - 80 - i * 62, 55, '❌', { fontSize: '34px' }).setOrigin(0.5).setVisible(false);
      return { icon: t, cross: x };
    });

    this.roundText = bigText(this, GAME_W / 2, 155, `ROUND 1 • ${this.diff.name} • first to 2`, 26, '#ffd94a');

    smallText(this, 500 + (6 * O_CELL) / 2, 292, `${this.rival.name}'s board`, 20, '#9d9ac4');
    this.warnText = bigText(this, 250, 285, '', 30, '#e4572e');
  }

  refreshTeams() {
    this.playerTeamIcons.forEach((o, i) => {
      const ko = i < this.rivalWins;
      o.icon.setAlpha(ko ? 0.3 : 1);
      o.cross.setVisible(ko);
    });
    this.rivalTeamIcons.forEach((o, i) => {
      const ko = i < this.playerWins;
      o.icon.setAlpha(ko ? 0.3 : 1);
      o.cross.setVisible(ko);
    });
  }

  // ------------------------------------------------------------------ boards
  makeBoards() {
    if (this.boards) {
      this.boards.player.destroy();
      this.boards.cpu.destroy();
    }
    const player = new Board(this, {
      x: 12, y: 300, cell: P_CELL,
      riseInterval: this.riseMs + 400,
      startRows: 5,
      graceMs: 2400,
      onGameOver: () => this.endRound('rival'),
      onAttack: (a) => this.sendAttack(a, 'cpu'),
      onScore: (s) => this.playerScoreText.setText('Score: ' + s)
    });
    const cpu = new Board(this, {
      x: 500, y: 310, cell: O_CELL,
      riseInterval: this.riseMs,
      startRows: 5,
      interactive: false,
      quiet: true,
      showPopups: false,
      graceMs: 2000,
      onGameOver: () => this.endRound('player'),
      onAttack: (a) => this.sendAttack(a, 'player')
    });
    this.ai = new AI(cpu, {
      interval: Math.max(90, this.rival.ai.interval * this.diff.aiMul),
      mistake: this.rival.ai.mistake * this.diff.mistakeMul,
      raise: this.rival.ai.raise || this.diff.aiRaise
    });
    this.boards = { player, cpu };
    player.setPaused(true);
    cpu.setPaused(true);
  }

  sendAttack(attack, targetKey) {
    if (!this.roundActive) return;
    const list = attack.type === 'combo' ? comboGarbage(attack.size) : chainGarbage(attack.level);
    if (!list.length) return;
    const target = this.boards[targetKey === 'cpu' ? 'cpu' : 'player'];
    for (const g of list) target.queueGarbage(g.w, g.h);
    // little projectile flair
    const from = targetKey === 'cpu' ? this.boards.player : this.boards.cpu;
    const to = target;
    const p = this.add.text(from.x + from.w / 2, from.y + 100, '💢', { fontSize: '44px' })
      .setOrigin(0.5).setDepth(150);
    this.tweens.add({
      targets: p,
      x: to.x + to.w / 2, y: to.y + 60,
      duration: 420, ease: 'Quad.in',
      onComplete: () => p.destroy()
    });
  }

  // ------------------------------------------------------------------ flow
  showIntro() {
    const ui = this.add.container(0, 0).setDepth(300);
    ui.add(this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x000000, 0.75).setInteractive());
    ui.add(panelBg(this, GAME_W / 2, GAME_H / 2, 600, 700));
    ui.add(smallText(this, GAME_W / 2, GAME_H / 2 - 290, `RIVAL ${this.rivalIndex + 1} / ${RIVALS.length}`, 28, '#9d9ac4'));
    const face = this.add.text(GAME_W / 2, GAME_H / 2 - 170, this.rival.emoji, { fontSize: '130px' }).setOrigin(0.5);
    ui.add(face);
    this.tweens.add({ targets: face, y: face.y - 14, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    ui.add(bigText(this, GAME_W / 2, GAME_H / 2 - 40, this.rival.name.toUpperCase(), 62, '#ffd94a'));
    ui.add(smallText(this, GAME_W / 2, GAME_H / 2 + 15, this.rival.title, 30, '#f28f6b'));
    ui.add(smallText(this, GAME_W / 2, GAME_H / 2 + 80, `“${this.rival.taunt}”`, 24));
    const teamStr = this.rival.team.map(m => `${m.emoji} ${m.name}`).join('   ');
    ui.add(smallText(this, GAME_W / 2, GAME_H / 2 + 150, teamStr, 26, '#c9c6ef'));
    ui.add(makeButton(this, GAME_W / 2, GAME_H / 2 + 260, 420, 100, '⚔  BATTLE!', () => {
      ui.destroy();
      this.startRound();
    }, { color: 0x7a2c3e, stroke: 0xe4572e, fontSize: 42 }));
  }

  startRound() {
    this.makeBoards();
    this.refreshTeams();
    this.roundText.setText(`ROUND ${this.roundNum} • ${this.diff.name} • first to 2`);

    const nums = ['3', '2', '1', 'GO!'];
    nums.forEach((n, i) => {
      this.time.delayedCall(650 * i, () => {
        const t = bigText(this, GAME_W / 2, GAME_H / 2, n, 150, n === 'GO!' ? '#7fd486' : '#ffd94a').setDepth(300);
        sfx.cursor();
        this.tweens.add({
          targets: t, scale: 1.6, alpha: 0, duration: 600,
          onComplete: () => t.destroy()
        });
        if (n === 'GO!') {
          this.boards.player.setPaused(false);
          this.boards.cpu.setPaused(false);
          this.roundActive = true;
          sfx.combo();
        }
      });
    });
  }

  endRound(winner) {
    if (!this.roundActive) return;
    this.roundActive = false;
    this.matchScore += this.boards.player.score;
    this.boards.player.setPaused(true);
    this.boards.cpu.setPaused(true);
    if (!this.boards.player.over) this.boards.player.over = true;
    if (!this.boards.cpu.over) this.boards.cpu.over = true;

    if (winner === 'player') { this.playerWins++; sfx.win(); }
    else { this.rivalWins++; sfx.ko(); }
    this.refreshTeams();

    const koTeam = winner === 'player' ? this.rival.team : PLAYER.team;
    const koIdx = (winner === 'player' ? this.playerWins : this.rivalWins) - 1;
    const koName = koTeam[Math.min(koIdx, 2)];

    const msg = winner === 'player'
      ? `ROUND WON!\n${koName.emoji} ${koName.name} fainted!`
      : `ROUND LOST...\nyour ${koName.emoji} ${koName.name} fainted!`;
    const t = bigText(this, GAME_W / 2, GAME_H / 2 - 60, msg, 48, winner === 'player' ? '#7fd486' : '#e4572e').setDepth(300);

    this.time.delayedCall(2100, () => {
      t.destroy();
      if (this.playerWins >= 2) this.matchWon();
      else if (this.rivalWins >= 2) this.matchLost();
      else {
        this.roundNum++;
        this.startRound();
      }
    });
  }

  // arcade initials entry over a dark backdrop, then cb(rank)
  showEntryThen(runTotal, cb) {
    const ui = this.add.container(0, 0).setDepth(350);
    ui.add(this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x000000, 0.8).setInteractive());
    ui.add(panelBg(this, GAME_W / 2, GAME_H / 2 + 20, 620, 760));
    ui.add(bigText(this, GAME_W / 2, GAME_H / 2 - 300, '🏆 HIGH SCORE! 🏆', 46, '#ffd94a'));
    ui.add(bigText(this, GAME_W / 2, GAME_H / 2 - 228, `Story run: ${runTotal}`, 42, '#7fd486'));
    ui.add(smallText(this, GAME_W / 2, GAME_H / 2 - 165, 'Enter your initials:', 28));
    ui.add(initialsEntry(this, GAME_W / 2, GAME_H / 2 - 80, (name) => {
      const rank = addScore('story', this.diffIdx, name, runTotal);
      ui.destroy();
      cb(rank);
    }));
    sfx.win();
  }

  matchWon() {
    music.stop();
    const progress = this.registry.get('rivalProgress');
    if (this.rivalIndex === progress) this.registry.set('rivalProgress', progress + 1);
    const champion = this.rivalIndex === RIVALS.length - 1;

    const runTotal = (this.registry.get('storyRunScore') || 0) + this.matchScore;
    if (!champion) {
      // bank the score and keep climbing
      this.registry.set('storyRunScore', runTotal);
      this.showWinPanel(champion, runTotal, null);
      return;
    }
    // run complete — submit to the story leaderboard
    this.registry.set('storyRunScore', 0);
    if (qualifies('story', this.diffIdx, runTotal)) {
      this.showEntryThen(runTotal, (rank) => this.showWinPanel(champion, runTotal, rank));
    } else {
      this.showWinPanel(champion, runTotal, null);
    }
  }

  showWinPanel(champion, runTotal, rank) {
    const ui = this.add.container(0, 0).setDepth(300);
    ui.add(this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x000000, 0.78).setInteractive());
    ui.add(panelBg(this, GAME_W / 2, GAME_H / 2, 600, 640));
    ui.add(bigText(this, GAME_W / 2, GAME_H / 2 - 230, champion ? '🏆 CHAMPION! 🏆' : 'VICTORY!', 62, '#ffd94a'));
    ui.add(this.add.text(GAME_W / 2, GAME_H / 2 - 110, this.rival.emoji, { fontSize: '100px' }).setOrigin(0.5).setAlpha(0.85));
    ui.add(smallText(this, GAME_W / 2, GAME_H / 2 - 10, `“${this.rival.winLine}”`, 26));
    ui.add(smallText(this, GAME_W / 2, GAME_H / 2 + 45,
      rank ? `Run score: ${runTotal} — Rank #${rank} (${this.diff.name})!` : `Run score so far: ${runTotal}`,
      26, rank ? '#ffd94a' : '#7fd486'));
    if (champion) {
      ui.add(smallText(this, GAME_W / 2, GAME_H / 2 + 85, 'You beat every rival in the league!', 26, '#7fd486'));
      this.confetti();
    }
    sfx.win();

    if (!champion) {
      ui.add(makeButton(this, GAME_W / 2, GAME_H / 2 + 150, 440, 95, 'NEXT RIVAL  ➜', () => {
        this.scene.restart();
      }, { color: 0x1f5e35, stroke: 0x43aa4b, fontSize: 38 }));
    } else {
      ui.add(makeButton(this, GAME_W / 2, GAME_H / 2 + 150, 440, 95, 'PLAY AGAIN', () => {
        this.registry.set('rivalProgress', 0);
        this.scene.restart();
      }, { color: 0x1f5e35, stroke: 0x43aa4b, fontSize: 38 }));
    }
    ui.add(makeButton(this, GAME_W / 2, GAME_H / 2 + 260, 440, 90, 'MENU', () => this.scene.start('Menu')));
  }

  matchLost() {
    music.stop();
    const runTotal = (this.registry.get('storyRunScore') || 0) + this.matchScore;
    this.registry.set('storyRunScore', 0);
    if (qualifies('story', this.diffIdx, runTotal)) {
      this.showEntryThen(runTotal, (rank) => this.showLosePanel(runTotal, rank));
    } else {
      this.showLosePanel(runTotal, null);
    }
  }

  showLosePanel(runTotal, rank) {
    const ui = this.add.container(0, 0).setDepth(300);
    ui.add(this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x000000, 0.78).setInteractive());
    ui.add(panelBg(this, GAME_W / 2, GAME_H / 2, 600, 600));
    ui.add(bigText(this, GAME_W / 2, GAME_H / 2 - 210, 'DEFEAT...', 62, '#e4572e'));
    ui.add(this.add.text(GAME_W / 2, GAME_H / 2 - 95, this.rival.emoji, { fontSize: '100px' }).setOrigin(0.5));
    ui.add(smallText(this, GAME_W / 2, GAME_H / 2 + 0, `“${this.rival.loseLine}”`, 26));
    ui.add(smallText(this, GAME_W / 2, GAME_H / 2 + 45,
      rank ? `Run score: ${runTotal} — Rank #${rank} (${this.diff.name})!` : `Run score: ${runTotal}`,
      24, rank ? '#ffd94a' : '#c9c6ef'));
    sfx.lose();
    ui.add(makeButton(this, GAME_W / 2, GAME_H / 2 + 120, 440, 95, 'REMATCH', () => {
      this.scene.restart();
    }, { color: 0x7a2c3e, stroke: 0xe4572e, fontSize: 38 }));
    ui.add(makeButton(this, GAME_W / 2, GAME_H / 2 + 235, 440, 90, 'MENU', () => this.scene.start('Menu')));
  }

  confetti() {
    const em = this.add.particles(GAME_W / 2, -20, 'spark', {
      x: { min: -GAME_W / 2, max: GAME_W / 2 },
      speedY: { min: 120, max: 320 },
      speedX: { min: -60, max: 60 },
      scale: { start: 0.9, end: 0.3 },
      angle: { min: 0, max: 360 },
      rotate: { min: 0, max: 360 },
      lifespan: 5000,
      quantity: 3,
      tint: [0xe4572e, 0xf3a712, 0x43aa4b, 0x29b6c5, 0x8e6bbf, 0xffffff]
    }).setDepth(290);
    this.time.delayedCall(4500, () => em.stop());
  }

  // ------------------------------------------------------------------ controls
  buildRaiseButton() {
    const x = GAME_W - 78, y = GAME_H - 96;
    const c = this.add.container(x, y).setDepth(100);
    const bg = this.add.circle(0, 0, 60, 0xe4572e, 0.92).setStrokeStyle(4, 0xffffff);
    const label = this.add.text(0, 0, '⬆\nRAISE', {
      fontFamily: UI.font, fontSize: '20px', color: '#fff', align: 'center'
    }).setOrigin(0.5);
    c.add([bg, label]);
    c.setSize(120, 120).setInteractive();
    c.on('pointerdown', () => {
      sfx.ensure();
      if (this.boards && this.roundActive) this.boards.player.forceRaise(true);
      bg.setFillStyle(0xff7a4d);
    });
    const off = () => {
      if (this.boards) this.boards.player.forceRaise(false);
      bg.setFillStyle(0xe4572e);
    };
    c.on('pointerup', off);
    c.on('pointerout', off);
  }

  setupKeyboard() {
    const k = this.input.keyboard;
    if (!k) return;
    const b = () => this.boards && this.roundActive ? this.boards.player : null;
    k.on('keydown-LEFT', () => b() && b().moveCursor(0, -1));
    k.on('keydown-RIGHT', () => b() && b().moveCursor(0, 1));
    k.on('keydown-UP', () => b() && b().moveCursor(1, 0));
    k.on('keydown-DOWN', () => b() && b().moveCursor(-1, 0));
    k.on('keydown-SPACE', () => b() && b().swapAtCursor());
    k.on('keydown-Z', () => b() && b().swapAtCursor());
    k.on('keydown-X', () => b() && b().forceRaise(true));
    k.on('keyup-X', () => b() && b().forceRaise(false));
    k.on('keydown-SHIFT', () => b() && b().forceRaise(true));
    k.on('keyup-SHIFT', () => b() && b().forceRaise(false));
    k.on('keydown-ESC', () => this.scene.start('Menu'));
  }

  update(_, dtRaw) {
    const dt = Math.min(dtRaw, 50);
    if (!this.boards) return;
    this.boards.player.update(dt);
    this.boards.cpu.update(dt);
    if (this.roundActive) this.ai.update(dt);

    const q = this.boards.player.garbageQueue.length;
    this.warnText.setText(q > 0 ? `⚠ INCOMING x${q}` : '');
  }
}
