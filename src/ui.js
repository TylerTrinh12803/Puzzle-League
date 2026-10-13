import { UI } from './constants.js';
import { sfx } from './audio.js';
import { music } from './music.js';

export function makeButton(scene, x, y, w, h, label, onClick, opts = {}) {
  const bgColor = opts.color ?? 0x2b2660;
  const c = scene.add.container(x, y);
  const bg = scene.add.rectangle(0, 0, w, h, bgColor, 1)
    .setStrokeStyle(4, opts.stroke ?? 0x6a63c9);
  const txt = scene.add.text(0, 0, label, {
    fontFamily: UI.font,
    fontSize: (opts.fontSize ?? 34) + 'px',
    color: opts.textColor ?? '#ffffff',
    align: 'center'
  }).setOrigin(0.5);
  c.add([bg, txt]);
  c.setSize(w, h);
  c.setInteractive({ useHandCursor: true });
  c.on('pointerdown', () => {
    sfx.ensure();
    sfx.cursor();
    scene.tweens.add({ targets: c, scale: 0.93, duration: 60, yoyo: true, onComplete: () => onClick && onClick() });
  });
  c.on('pointerover', () => bg.setFillStyle(bgColor + 0x101030));
  c.on('pointerout', () => bg.setFillStyle(bgColor));
  return c;
}

export function panelBg(scene, x, y, w, h, alpha = 0.96) {
  return scene.add.rectangle(x, y, w, h, UI.panel, alpha).setStrokeStyle(4, UI.panelLine);
}

export function bigText(scene, x, y, str, size, color = '#ffffff') {
  return scene.add.text(x, y, str, {
    fontFamily: UI.font,
    fontSize: size + 'px',
    color,
    stroke: '#000000',
    strokeThickness: Math.max(4, size / 8),
    align: 'center'
  }).setOrigin(0.5);
}

export function smallText(scene, x, y, str, size, color = '#c9c6ef') {
  return scene.add.text(x, y, str, {
    fontFamily: 'Arial, sans-serif',
    fontSize: size + 'px',
    color,
    align: 'center'
  }).setOrigin(0.5);
}

// speaker button that toggles the chiptune music on/off (M key does the same)
export function musicToggle(scene, x, y, size = 40) {
  const t = scene.add.text(x, y, music.muted ? '🔇' : '🔊', { fontSize: size + 'px' })
    .setOrigin(0.5).setDepth(120).setInteractive({ useHandCursor: true }).setPadding(10);
  const refresh = () => t.setText(music.muted ? '🔇' : '🔊');
  t.on('pointerdown', () => { sfx.ensure(); music.toggle(); refresh(); });
  if (scene.input.keyboard) {
    const h = () => { music.toggle(); refresh(); };
    scene.input.keyboard.on('keydown-M', h);
    scene.events.once('shutdown', () => scene.input.keyboard && scene.input.keyboard.off('keydown-M', h));
  }
  return t;
}

// arcade-style 3-letter initials entry. Calls onDone('ABC').
export function initialsEntry(scene, x, y, onDone) {
  const c = scene.add.container(x, y);
  let letters = [];

  const slots = [0, 1, 2].map(i => {
    const box = scene.add.rectangle((i - 1) * 90, 0, 76, 86, 0x0b0a24).setStrokeStyle(3, 0x6a63c9);
    const t = scene.add.text((i - 1) * 90, 0, '_', {
      fontFamily: UI.font, fontSize: '52px', color: '#ffd94a'
    }).setOrigin(0.5);
    c.add([box, t]);
    return t;
  });

  const refresh = () => {
    slots.forEach((s, i) => s.setText(letters[i] || '_'));
  };

  const push = (ch) => { if (letters.length < 3) { letters.push(ch); sfx.cursor(); refresh(); } };
  const pop = () => { letters.pop(); sfx.cursor(); refresh(); };
  const finish = () => {
    if (!letters.length) letters = ['A', 'A', 'A'];
    while (letters.length < 3) letters.push('A');
    cleanup();
    onDone(letters.join(''));
  };

  // on-screen keyboard: A-Z + DEL + OK
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const cols = 7, bw = 74, bh = 68;
  const gridY = 90;
  const keys = [...chars, '⌫', 'OK'];
  keys.forEach((ch, i) => {
    const col = i % cols, row = Math.floor(i / cols);
    const kx = (col - (cols - 1) / 2) * bw;
    const ky = gridY + row * bh;
    const isOk = ch === 'OK', isDel = ch === '⌫';
    const bg = scene.add.rectangle(kx, ky, bw - 8, bh - 8,
      isOk ? 0x1f5e35 : isDel ? 0x5a2436 : 0x2b2660)
      .setStrokeStyle(2, isOk ? 0x43aa4b : isDel ? 0xe4572e : 0x6a63c9)
      .setInteractive({ useHandCursor: true });
    const txt = scene.add.text(kx, ky, ch, {
      fontFamily: UI.font, fontSize: '30px', color: '#ffffff'
    }).setOrigin(0.5);
    bg.on('pointerdown', () => {
      if (isOk) finish();
      else if (isDel) pop();
      else push(ch);
    });
    c.add([bg, txt]);
  });

  // physical keyboard too
  const keyHandler = (ev) => {
    const k = ev.key;
    if (/^[a-zA-Z]$/.test(k)) push(k.toUpperCase());
    else if (k === 'Backspace') pop();
    else if (k === 'Enter') finish();
  };
  const cleanup = () => {
    scene.input.keyboard && scene.input.keyboard.off('keydown', keyHandler);
    c.destroy();
  };
  scene.input.keyboard && scene.input.keyboard.on('keydown', keyHandler);

  refresh();
  return c;
}

// simple vertical gradient background made of strips
export function gradientBg(scene, w, h, top, bottom) {
  const steps = 24;
  const tc = Phaser.Display.Color.IntegerToColor(top);
  const bc = Phaser.Display.Color.IntegerToColor(bottom);
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    const col = Phaser.Display.Color.Interpolate.ColorWithColor(tc, bc, steps - 1, i);
    const color = Phaser.Display.Color.GetColor(col.r, col.g, col.b);
    scene.add.rectangle(w / 2, (h / steps) * (i + 0.5), w, h / steps + 2, color).setDepth(-10);
  }
}
