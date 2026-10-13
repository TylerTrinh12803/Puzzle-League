import { GAME_W, GAME_H, UI } from '../constants.js';
import { makeButton, bigText, smallText, panelBg, gradientBg } from '../ui.js';

export class Tutorial extends Phaser.Scene {
  constructor() { super('Tutorial'); }

  create() {
    gradientBg(this, GAME_W, GAME_H, 0x141040, 0x060414);
    bigText(this, GAME_W / 2, 100, '❓ HOW TO PLAY', 52, '#ffd94a');

    // --- goal demo: three matching blocks + cursor
    let y = 200;
    panelBg(this, GAME_W / 2, y + 60, 640, 190);
    bigText(this, GAME_W / 2, y, 'THE GOAL', 30, '#7fd486');
    for (let i = 0; i < 3; i++) {
      this.add.image(GAME_W / 2 - 70 + i * 70, y + 60, 'block0').setScale(0.65);
    }
    this.add.image(GAME_W / 2 - 105, y + 60, 'cursor').setScale(0.65).setOrigin(0, 0.5).setAlpha(0.9);
    smallText(this, GAME_W / 2, y + 125,
      'Line up 3+ matching panels (across or up/down) to clear them.\nThe stack keeps rising — if it hits the top, you lose!', 22).setLineSpacing(5);

    // --- touch controls
    y = 425;
    panelBg(this, GAME_W / 2, y + 75, 640, 170);
    bigText(this, GAME_W / 2, y, '📱 TOUCH', 30, '#29b6c5');
    smallText(this, GAME_W / 2, y + 75,
      '• Drag a panel LEFT / RIGHT to swap it\n• Keep dragging to slide it across the board\n• Hold the RAISE button to lift the stack faster', 24).setLineSpacing(8);

    // --- keyboard controls
    y = 640;
    panelBg(this, GAME_W / 2, y + 105, 640, 240);
    bigText(this, GAME_W / 2, y, '⌨ KEYBOARD', 30, '#29b6c5');
    smallText(this, GAME_W / 2, y + 60, 'SOLO  (Story / Endless)', 22, '#ffd94a');
    smallText(this, GAME_W / 2, y + 100,
      'Arrows = move cursor    Z or Space = swap\nX or Shift = raise    Esc = pause', 24).setLineSpacing(6);
    smallText(this, GAME_W / 2, y + 160, 'PVP  (2 players, 1 keyboard)', 22, '#ffd94a');
    smallText(this, GAME_W / 2, y + 197,
      'P1: WASD move • F swap • G raise      P2: Arrows • K swap • L raise', 22);

    // --- chains & garbage
    y = 920;
    panelBg(this, GAME_W / 2, y + 90, 640, 200);
    bigText(this, GAME_W / 2, y, '⚡ CHAINS & GARBAGE', 30, '#e4572e');
    smallText(this, GAME_W / 2, y + 90,
      '• Clear 4+ at once = COMBO → sends garbage to your rival\n• Panels that fall into another clear = CHAIN → big garbage!\n• Clear panels touching a garbage slab to break it into panels\n• Chains also freeze your stack for a moment', 22).setLineSpacing(8);

    makeButton(this, GAME_W / 2, GAME_H - 100, 340, 90, 'GOT IT!', () => {
      this.scene.start('Menu');
    }, { color: 0x1f5e35, stroke: 0x43aa4b, fontSize: 36 });
  }
}
