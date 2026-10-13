import { COLORS, COLORS_LIGHT, SYMBOLS, NTYPES } from './constants.js';

// All art is generated at runtime with Graphics — zero external assets.
const TEX = 96; // base block texture size

function darken(color, amt) {
  const c = Phaser.Display.Color.IntegerToColor(color);
  c.darken(amt);
  return c.color;
}

function drawSymbol(g, name, cx, cy, s) {
  g.fillStyle(0xffffff, 0.92);
  switch (name) {
    case 'heart': {
      g.fillCircle(cx - s * 0.42, cy - s * 0.25, s * 0.46);
      g.fillCircle(cx + s * 0.42, cy - s * 0.25, s * 0.46);
      g.fillTriangle(cx - s * 0.84, cy - 0.02 * s, cx + s * 0.84, cy - 0.02 * s, cx, cy + s * 0.95);
      break;
    }
    case 'star': {
      const pts = [];
      for (let i = 0; i < 10; i++) {
        const ang = -Math.PI / 2 + (i * Math.PI) / 5;
        const rad = i % 2 === 0 ? s : s * 0.45;
        pts.push(new Phaser.Geom.Point(cx + Math.cos(ang) * rad, cy + Math.sin(ang) * rad));
      }
      g.fillPoints(pts, true);
      break;
    }
    case 'diamond': {
      g.fillPoints([
        new Phaser.Geom.Point(cx, cy - s),
        new Phaser.Geom.Point(cx + s * 0.75, cy),
        new Phaser.Geom.Point(cx, cy + s),
        new Phaser.Geom.Point(cx - s * 0.75, cy)
      ], true);
      break;
    }
    case 'circle': {
      g.fillCircle(cx, cy, s * 0.85);
      break;
    }
    case 'triangle': {
      g.fillTriangle(cx, cy - s * 0.9, cx + s * 0.95, cy + s * 0.7, cx - s * 0.95, cy + s * 0.7);
      break;
    }
    case 'drop': {
      g.fillCircle(cx, cy + s * 0.25, s * 0.62);
      g.fillTriangle(cx - s * 0.55, cy + s * 0.05, cx + s * 0.55, cy + s * 0.05, cx, cy - s * 0.95);
      break;
    }
  }
}

export function makeTextures(scene) {
  const g = scene.add.graphics();

  // ---- panel blocks ----
  for (let i = 0; i < NTYPES; i++) {
    g.clear();
    const base = COLORS[i];
    const light = COLORS_LIGHT[i];
    const dark = darken(base, 35);
    // body
    g.fillStyle(dark, 1);
    g.fillRoundedRect(4, 8, TEX - 8, TEX - 12, 20);
    g.fillStyle(base, 1);
    g.fillRoundedRect(4, 4, TEX - 8, TEX - 12, 20);
    // top sheen
    g.fillStyle(light, 0.85);
    g.fillRoundedRect(11, 10, TEX - 22, TEX * 0.34, 14);
    // symbol
    drawSymbol(g, SYMBOLS[i], TEX / 2, TEX / 2 + 4, TEX * 0.26);
    g.generateTexture('block' + i, TEX, TEX);
  }

  // ---- garbage slab tile ----
  g.clear();
  g.fillStyle(0x3c3c52, 1);
  g.fillRoundedRect(2, 6, TEX - 4, TEX - 8, 10);
  g.fillStyle(0x565672, 1);
  g.fillRoundedRect(2, 2, TEX - 4, TEX - 8, 10);
  g.fillStyle(0x6f6f92, 0.7);
  g.fillRoundedRect(8, 8, TEX - 16, TEX * 0.3, 8);
  g.fillStyle(0x2b2b3e, 1);
  g.fillCircle(16, TEX - 20, 5);
  g.fillCircle(TEX - 16, TEX - 20, 5);
  g.generateTexture('garbage', TEX, TEX);

  // ---- cursor (2 cells wide bracket frame) ----
  g.clear();
  const t = 7; // thickness
  const arm = 26;
  g.fillStyle(0xffffff, 1);
  const corners = [
    [2, 2, 1, 1], [TEX * 2 - 2, 2, -1, 1],
    [2, TEX - 2, 1, -1], [TEX * 2 - 2, TEX - 2, -1, -1]
  ];
  for (const [x, y, sx, sy] of corners) {
    g.fillRect(Math.min(x, x + sx * arm), Math.min(y, y + sy * t), arm, t);
    g.fillRect(Math.min(x, x + sx * t), Math.min(y, y + sy * arm), t, arm);
  }
  // middle notches
  g.fillRect(TEX - t / 2, 2, t, arm * 0.7);
  g.fillRect(TEX - t / 2, TEX - 2 - arm * 0.7, t, arm * 0.7);
  g.generateTexture('cursor', TEX * 2, TEX);

  // ---- particle ----
  g.clear();
  g.fillStyle(0xffffff, 1);
  g.fillRoundedRect(0, 0, 18, 18, 5);
  g.generateTexture('spark', 18, 18);

  // ---- soft round glow (menus) ----
  g.clear();
  g.fillStyle(0xffffff, 0.14);
  g.fillCircle(64, 64, 64);
  g.fillStyle(0xffffff, 0.2);
  g.fillCircle(64, 64, 44);
  g.generateTexture('glow', 128, 128);

  g.destroy();
}
