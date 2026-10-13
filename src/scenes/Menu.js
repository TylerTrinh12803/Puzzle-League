import { GAME_W, GAME_H, UI } from '../constants.js';
import { makeButton, bigText, smallText, gradientBg, musicToggle } from '../ui.js';
import { RIVALS, PLAYER } from '../rivals.js';
import { music } from '../music.js';
import { sfx } from '../audio.js';

export class Menu extends Phaser.Scene {
  constructor() { super('Menu'); }

  create() {
    gradientBg(this, GAME_W, GAME_H, 0x141040, 0x060414);

    // floating creatures
    const floaters = [...PLAYER.team, ...RIVALS.flatMap(r => r.team)];
    for (let i = 0; i < 10; i++) {
      const f = floaters[i % floaters.length];
      const x = Phaser.Math.Between(40, GAME_W - 40);
      const y = Phaser.Math.Between(120, GAME_H - 120);
      const t = this.add.text(x, y, f.emoji, { fontSize: '42px' }).setAlpha(0.15);
      this.tweens.add({
        targets: t,
        y: y - Phaser.Math.Between(30, 80),
        duration: Phaser.Math.Between(3000, 6500),
        yoyo: true, repeat: -1, ease: 'Sine.inOut',
        delay: Phaser.Math.Between(0, 2000)
      });
    }

    // falling demo panels behind the title
    for (let i = 0; i < 8; i++) {
      const img = this.add.image(
        Phaser.Math.Between(30, GAME_W - 30),
        Phaser.Math.Between(-600, -50),
        'block' + (i % 6)
      ).setScale(0.55).setAlpha(0.3).setAngle(Phaser.Math.Between(-25, 25));
      this.tweens.add({
        targets: img, y: GAME_H + 80, angle: img.angle + 90,
        duration: Phaser.Math.Between(9000, 16000), repeat: -1,
        delay: Phaser.Math.Between(0, 8000)
      });
    }

    const title1 = bigText(this, GAME_W / 2, 170, 'PUZZLE', 100, '#ffd94a');
    const title2 = bigText(this, GAME_W / 2, 270, 'LEAGUE', 100, '#7fd486');
    this.tweens.add({ targets: [title1, title2], y: '+=12', duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    smallText(this, GAME_W / 2, 350, 'Swap panels • Match 3 • Chain attacks!', 25);

    const progress = this.registry.get('rivalProgress');
    const storyLabel = progress >= RIVALS.length
      ? '⚔  STORY  🏆'
      : `⚔  STORY  (${progress}/${RIVALS.length})`;

    makeButton(this, GAME_W / 2, 470, 500, 104, storyLabel, () => {
      this.scene.start('DiffSelect', { target: 'Versus' });
    }, { color: 0x7a2c3e, stroke: 0xe4572e, fontSize: 40 });

    makeButton(this, GAME_W / 2, 600, 500, 104, '🎮  PVP  (2 PLAYERS)', () => {
      this.scene.start('DiffSelect', { target: 'PvP' });
    }, { color: 0x5c4d16, stroke: 0xf3a712, fontSize: 38 });

    makeButton(this, GAME_W / 2, 730, 500, 104, '∞  ENDLESS', () => {
      this.scene.start('DiffSelect', { target: 'Endless' });
    }, { color: 0x1f4f6e, stroke: 0x29b6c5, fontSize: 40 });

    makeButton(this, GAME_W / 2 - 128, 856, 244, 88, '❓ TUTORIAL', () => {
      this.scene.start('Tutorial');
    }, { fontSize: 26 });
    makeButton(this, GAME_W / 2 + 128, 856, 244, 88, '🏆 RANKINGS', () => {
      this.scene.start('Leaderboard');
    }, { color: 0x6e5716, stroke: 0xf3a712, fontSize: 26 });

    const best = this.registry.get('bestScore');
    if (best > 0) smallText(this, GAME_W / 2, 935, `Best endless score: ${best}`, 22, '#ffd94a');

    // rival lineup preview
    const y0 = 1050;
    smallText(this, GAME_W / 2, y0 - 52, '— THE RIVALS —', 24, '#9d9ac4');
    RIVALS.forEach((r, i) => {
      const x = GAME_W / 2 + (i - 1) * 190;
      const beaten = progress > i;
      this.add.text(x, y0, r.emoji, { fontSize: '58px' }).setOrigin(0.5).setAlpha(beaten ? 1 : 0.85);
      smallText(this, x, y0 + 52, r.name, 22, beaten ? '#7fd486' : '#c9c6ef');
      if (beaten) this.add.text(x + 38, y0 - 22, '✅', { fontSize: '26px' }).setOrigin(0.5);
    });

    smallText(this, GAME_W / 2, GAME_H - 60,
      'New here? Hit ❓ TUTORIAL for a 30-second crash course.', 22);

    musicToggle(this, GAME_W - 52, 46);
    music.play('menu');
    this.input.on('pointerdown', () => sfx.ensure()); // unlock audio on tap
  }
}
