import { COLS, ROWS, NTYPES } from './constants.js';
import { sfx } from './audio.js';

// Block states
const IDLE = 0, SWAP = 1, FALL = 2, CLEAR = 3;

/**
 * One puzzle board: 6x12 grid of panels that rise from the bottom.
 * Handles swapping, matching, gravity, chains, combos, garbage and top-out.
 * Used by both the player (touch/keyboard) and the CPU (via trySwapAt/setCursor).
 */
export class Board {
  constructor(scene, cfg) {
    this.scene = scene;
    this.x = cfg.x;
    this.y = cfg.y;
    this.cell = cfg.cell;
    this.interactive = cfg.interactive !== false;
    this.riseInterval = cfg.riseInterval || 10000; // ms for one full row
    this.onGameOver = cfg.onGameOver || (() => {});
    this.onAttack = cfg.onAttack || (() => {});   // {type:'combo'|'chain', size|level}
    this.onScore = cfg.onScore || (() => {});
    this.showPopups = cfg.showPopups !== false;
    this.quiet = !!cfg.quiet; // mini CPU board: fewer sounds
    this.cursorTint = cfg.cursorTint || 0;

    this.w = COLS * this.cell;
    this.h = ROWS * this.cell;

    this.grid = [];            // grid[row][col], row 0 = bottom
    for (let r = 0; r < ROWS; r++) this.grid.push(new Array(COLS).fill(null));
    this.garbages = [];
    this.garbageQueue = [];
    this.garbageCooldown = 0;

    this.riseProgress = 0;
    this.stopTimer = 0;
    this.dangerTimer = 0;
    this.graceMs = cfg.graceMs || 2200;
    this.manualRaise = false;

    this.chainLevel = 1;
    this.score = 0;
    this.rowsRaised = 0;
    this.activeClears = 0;
    this.fallingCount = 0;
    this.swapCount = 0;
    this.garbFalling = 0;

    this.over = false;
    this.paused = false;

    this.cursorR = 5;
    this.cursorC = 2;

    this.buildDisplay();
    this.fillInitial(cfg.startRows || 5);
    this.makeNextRow();
    if (this.interactive) this.setupInput();
  }

  // ---------------------------------------------------------------- display
  buildDisplay() {
    const s = this.scene;
    this.container = s.add.container(this.x, this.y);
    this.frame = s.add.rectangle(this.w / 2, this.h / 2, this.w + 10, this.h + 10, 0x0b0a24, 0.94)
      .setStrokeStyle(4, 0x4a4a8a);
    this.container.add(this.frame);

    this.blockLayer = s.add.container(0, 0);
    this.container.add(this.blockLayer);

    // mask: only the board window (plus a sliver of the incoming row) is visible
    const mg = s.make.graphics({ add: false });
    mg.fillStyle(0xffffff);
    mg.fillRect(this.x, this.y - this.cell * 0.2, this.w, this.h + this.cell * 0.2);
    this.maskGfx = mg;
    this.blockLayer.setMask(mg.createGeometryMask());

    this.cursor = s.add.image(0, 0, 'cursor')
      .setOrigin(0, 0)
      .setScale(this.cell / 96)
      .setDepth(5);
    if (this.cursorTint) this.cursor.setTint(this.cursorTint);
    this.blockLayer.add(this.cursor);

    this.popupLayer = s.add.container(0, 0).setDepth(50);
    this.container.add(this.popupLayer);
  }

  cellX(c) { return c * this.cell + this.cell / 2; }
  cellY(r) { return (ROWS - 1 - r) * this.cell + this.cell / 2; }

  makeBlock(type, r, c, dim = false) {
    const img = this.scene.add.image(this.cellX(c), this.cellY(r), 'block' + type)
      .setScale(this.cell / 96);
    if (dim) img.setTint(0x555577);
    this.blockLayer.addAt(img, 0);
    return { type, sprite: img, state: IDLE, chain: false, garbage: null };
  }

  // ---------------------------------------------------------------- setup
  randTypeAvoiding(r, c) {
    let t, tries = 0;
    do {
      t = Math.floor(Math.random() * NTYPES);
      tries++;
      const left1 = this.grid[r][c - 1], left2 = this.grid[r][c - 2];
      const down1 = r > 0 ? this.grid[r - 1][c] : null, down2 = r > 1 ? this.grid[r - 2][c] : null;
      const badH = left1 && left2 && left1.type === t && left2.type === t;
      const badV = down1 && down2 && down1.type === t && down2.type === t;
      if (!badH && !badV) break;
    } while (tries < 24);
    return t;
  }

  fillInitial(baseRows) {
    const heights = [];
    for (let c = 0; c < COLS; c++) {
      heights.push(Phaser.Math.Clamp(baseRows + Phaser.Math.Between(-2, 1), 2, ROWS - 5));
    }
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (r < heights[c]) {
          const t = this.randTypeAvoiding(r, c);
          this.grid[r][c] = this.makeBlock(t, r, c);
        }
      }
    }
  }

  makeNextRow() {
    this.nextRow = [];
    this.nextSprites = [];
    for (let c = 0; c < COLS; c++) {
      let t, tries = 0;
      do {
        t = Math.floor(Math.random() * NTYPES);
        tries++;
        const badH = c >= 2 && this.nextRow[c - 1] === t && this.nextRow[c - 2] === t;
        const a = this.grid[0][c], b = this.grid[1][c];
        const badV = a && b && a.type === t && b.type === t;
        if (!badH && !badV) break;
      } while (tries < 24);
      this.nextRow.push(t);
      const img = this.scene.add.image(this.cellX(c), this.cellY(-1), 'block' + t)
        .setScale(this.cell / 96).setTint(0x555577);
      this.blockLayer.addAt(img, 0);
      this.nextSprites.push(img);
    }
  }

  // ---------------------------------------------------------------- input
  setupInput() {
    const s = this.scene;
    this.zone = s.add.zone(this.x, this.y, this.w, this.h).setOrigin(0, 0).setInteractive();
    this.dragging = false;

    this.zone.on('pointerdown', (p) => {
      if (this.over || this.paused) return;
      sfx.ensure();
      const { r, c } = this.pointToCell(p);
      this.dragging = true;
      this.dragRow = r;
      this.dragCol = c;
      this.dragX = p.worldX;
      this.setCursor(r, Math.min(c, COLS - 2));
    });

    this.zone.on('pointermove', (p) => {
      if (!this.dragging || this.over || this.paused) return;
      const dx = p.worldX - this.dragX;
      const th = this.cell * 0.5;
      if (dx > th && this.dragCol < COLS - 1) {
        if (this.trySwapAt(this.dragRow, this.dragCol)) {
          this.dragCol++;
          this.setCursor(this.dragRow, Math.min(this.dragCol, COLS - 2));
        }
        this.dragX = p.worldX;
      } else if (dx < -th && this.dragCol > 0) {
        if (this.trySwapAt(this.dragRow, this.dragCol - 1)) {
          this.dragCol--;
          this.setCursor(this.dragRow, this.dragCol);
        }
        this.dragX = p.worldX;
      }
    });

    const endDrag = () => { this.dragging = false; };
    s.input.on('pointerup', endDrag);
    s.input.on('pointerupoutside', endDrag);
  }

  pointToCell(p) {
    const lx = p.worldX - this.x;
    const ly = p.worldY - this.y - this.blockLayer.y;
    const c = Phaser.Math.Clamp(Math.floor(lx / this.cell), 0, COLS - 1);
    const r = Phaser.Math.Clamp(ROWS - 1 - Math.floor(ly / this.cell), 0, ROWS - 1);
    return { r, c };
  }

  setCursor(r, c) {
    this.cursorR = Phaser.Math.Clamp(r, 0, ROWS - 1);
    this.cursorC = Phaser.Math.Clamp(c, 0, COLS - 2);
  }

  moveCursor(dr, dc) {
    if (this.over || this.paused) return;
    this.setCursor(this.cursorR + dr, this.cursorC + dc);
    sfx.cursor();
  }

  swapAtCursor() {
    if (this.over || this.paused) return;
    this.trySwapAt(this.cursorR, this.cursorC);
  }

  // ---------------------------------------------------------------- swap
  canTouch(b) {
    return !b || (b.state === IDLE && !b.garbage);
  }

  trySwapAt(r, c) {
    if (this.over || this.paused) return false;
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS - 1) return false;
    const a = this.grid[r][c];
    const b = this.grid[r][c + 1];
    if (!a && !b) return false;
    if (!this.canTouch(a) || !this.canTouch(b)) return false;

    this.grid[r][c] = b;
    this.grid[r][c + 1] = a;
    this.swapCount++;
    sfx.swap();

    let pending = 0;
    const done = () => {
      pending--;
      if (pending > 0) return;
      this.swapCount--;
      if (a) a.state = IDLE;
      if (b) b.state = IDLE;
      this.applyGravity(false);
      this.checkAllMatches();
    };

    if (a) {
      a.state = SWAP; a.chain = false; pending++;
      this.scene.tweens.add({ targets: a.sprite, x: this.cellX(c + 1), duration: 70, onComplete: done });
    }
    if (b) {
      b.state = SWAP; b.chain = false; pending++;
      this.scene.tweens.add({ targets: b.sprite, x: this.cellX(c), duration: 70, onComplete: done });
    }
    return true;
  }

  // ---------------------------------------------------------------- gravity
  applyGravity(fromClear) {
    // normal blocks
    for (let c = 0; c < COLS; c++) {
      for (let r = 1; r < ROWS; r++) {
        const b = this.grid[r][c];
        if (!b || b.garbage || b.state !== IDLE) continue;
        let nr = r;
        while (nr > 0 && !this.grid[nr - 1][c]) nr--;
        if (nr === r) continue;
        this.grid[nr][c] = b;
        this.grid[r][c] = null;
        b.state = FALL;
        if (fromClear) b.chain = true;
        this.fallingCount++;
        const dist = r - nr;
        this.scene.tweens.add({
          targets: b.sprite,
          y: this.cellY(nr),
          duration: 55 * dist + 40,
          ease: 'Linear',
          onComplete: () => {
            b.state = IDLE;
            this.fallingCount--;
            if (!this.quiet) sfx.land();
            const matched = this.checkAllMatches();
            if (!matched.has(b)) b.chain = false;
          }
        });
      }
    }
    // garbage slabs fall as units
    for (const g of this.garbages) {
      if (g.falling || g.dead) continue;
      let d = 0;
      let ok = true;
      while (ok && g.row - d - 1 >= 0) {
        for (let c = g.col; c < g.col + g.w; c++) {
          if (this.grid[g.row - d - 1][c]) { ok = false; break; }
        }
        if (ok) d++;
      }
      if (d > 0) this.dropGarbageBy(g, d);
    }
  }

  dropGarbageBy(g, d) {
    // clear old cells
    for (let r = g.row; r < g.row + g.h; r++) {
      for (let c = g.col; c < g.col + g.w; c++) this.grid[r][c] = null;
    }
    g.row -= d;
    for (let r = g.row; r < g.row + g.h; r++) {
      for (let c = g.col; c < g.col + g.w; c++) this.grid[r][c] = g.cellRef;
    }
    g.falling = true;
    this.garbFalling++;
    this.scene.tweens.add({
      targets: g.rect,
      y: this.garbY(g),
      duration: 60 * d + 50,
      ease: 'Quad.in',
      onComplete: () => {
        g.falling = false;
        this.garbFalling--;
        if (!this.quiet) sfx.land();
        this.applyGravity(false);
      }
    });
  }

  // ---------------------------------------------------------------- matching
  checkAllMatches() {
    const set = new Set();
    // horizontal
    for (let r = 0; r < ROWS; r++) {
      let run = 1;
      for (let c = 1; c <= COLS; c++) {
        const cur = c < COLS ? this.grid[r][c] : null;
        const prev = this.grid[r][c - 1];
        const same = cur && prev && !cur.garbage && !prev.garbage &&
          cur.state === IDLE && prev.state === IDLE && cur.type === prev.type;
        if (same) run++;
        else {
          if (run >= 3) for (let k = c - run; k < c; k++) set.add(this.grid[r][k]);
          run = 1;
        }
      }
    }
    // vertical
    for (let c = 0; c < COLS; c++) {
      let run = 1;
      for (let r = 1; r <= ROWS; r++) {
        const cur = r < ROWS ? this.grid[r][c] : null;
        const prev = this.grid[r - 1][c];
        const same = cur && prev && !cur.garbage && !prev.garbage &&
          cur.state === IDLE && prev.state === IDLE && cur.type === prev.type;
        if (same) run++;
        else {
          if (run >= 3) for (let k = r - run; k < r; k++) set.add(this.grid[k][c]);
          run = 1;
        }
      }
    }
    if (set.size >= 3) this.startClear(set);
    return set;
  }

  startClear(set) {
    const blocks = [...set];
    const combo = blocks.length;
    const isChain = blocks.some(b => b.chain);
    this.chainLevel = isChain ? this.chainLevel + 1 : 1;
    const chain = this.chainLevel;

    // score
    let pts = combo * 10;
    if (combo > 3) pts += (combo - 3) * 30;
    if (chain > 1) pts += 60 * chain;
    this.score += pts;
    this.onScore(this.score);

    // stop time (rise freeze)
    let stop = 350;
    if (combo > 3) stop += 1300;
    if (chain > 1) stop += 900 + 350 * chain;
    this.stopTimer = Math.min(this.stopTimer + stop, 9000);

    // find cleared cell coords (for garbage conversion) before removal
    const coords = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (set.has(this.grid[r][c])) coords.push([r, c]);
      }
    }

    // popups + attacks
    if (this.showPopups) {
      const [pr, pc] = coords[0] || [6, 2];
      if (chain > 1) this.popup(`CHAIN x${chain}!`, pc, pr, '#ffd94a');
      else if (combo > 3) this.popup(`${combo} COMBO!`, pc, pr, '#7fd486');
    }
    if (chain > 1 && !this.quiet) sfx.chain(chain);
    else if (combo > 3 && !this.quiet) sfx.combo();

    if (combo > 3) this.onAttack({ type: 'combo', size: combo });

    this.activeClears++;
    // sort top row first, left to right — classic pop order
    blocks.sort((b1, b2) => (b1.sprite.y - b2.sprite.y) || (b1.sprite.x - b2.sprite.x));

    for (const b of blocks) {
      b.state = CLEAR;
      this.scene.tweens.add({
        targets: b.sprite, alpha: 0.35, duration: 90,
        yoyo: true, repeat: 2
      });
    }

    const flashMs = 480;
    blocks.forEach((b, i) => {
      this.scene.time.delayedCall(flashMs + i * 85, () => {
        if (this.destroyed) return;
        b.sprite.setVisible(false);
        this.burst(b.sprite.x, b.sprite.y, b.type);
        if (!this.quiet) sfx.pop(i);
      });
    });

    this.scene.time.delayedCall(flashMs + blocks.length * 85 + 60, () => {
      if (this.destroyed) return;
      for (const b of blocks) {
        for (let r = 0; r < ROWS; r++) {
          const c = this.grid[r].indexOf(b);
          if (c !== -1) this.grid[r][c] = null;
        }
        b.sprite.destroy();
      }
      this.activeClears--;
      this.transformGarbage(coords);
      this.applyGravity(true);
      this.checkAllMatches();
    });
  }

  burst(x, y, type) {
    const em = this.scene.add.particles(this.x + x, this.y + y + this.blockLayer.y, 'spark', {
      speed: { min: 60, max: 220 },
      scale: { start: this.cell / 130, end: 0 },
      lifespan: 380,
      quantity: 7,
      tint: type >= 0 ? [0xffffff, 0xffe97a] : 0x9999bb,
      emitting: false
    });
    em.setDepth(60);
    em.explode(7);
    this.scene.time.delayedCall(500, () => em.destroy());
  }

  popup(text, c, r, color) {
    const t = this.scene.add.text(this.cellX(Phaser.Math.Clamp(c, 1, 4)), this.cellY(r) + this.blockLayer.y, text, {
      fontFamily: 'Arial Black, Arial',
      fontSize: Math.round(this.cell * 0.42) + 'px',
      color, stroke: '#000000', strokeThickness: 6
    }).setOrigin(0.5).setDepth(70);
    this.popupLayer.add(t);
    this.scene.tweens.add({
      targets: t, y: t.y - this.cell * 1.2, alpha: 0,
      duration: 1100, ease: 'Quad.out', onComplete: () => t.destroy()
    });
  }

  // ---------------------------------------------------------------- garbage
  queueGarbage(w, h) {
    this.garbageQueue.push({ w: Phaser.Math.Clamp(w, 2, COLS), h: Phaser.Math.Clamp(h, 1, 4) });
  }

  garbX(g) { return g.col * this.cell; }
  garbY(g) { return (ROWS - g.row - g.h) * this.cell; }

  trySpawnGarbage() {
    if (!this.garbageQueue.length) return;
    if (this.activeClears > 0 || this.garbFalling > 0 || this.garbageCooldown > 0) return;
    const item = this.garbageQueue.shift();
    this.garbageCooldown = 420;

    const col = item.w >= COLS ? 0 : Phaser.Math.Between(0, COLS - item.w);
    // landing row = highest stack top under footprint
    let land = 0;
    for (let c = col; c < col + item.w; c++) {
      for (let r = ROWS - 1; r >= 0; r--) {
        if (this.grid[r][c]) { land = Math.max(land, r + 1); break; }
      }
    }
    if (land + item.h > ROWS) {
      // no room — crushed
      this.lose();
      return;
    }

    const g = {
      col, row: land, w: item.w, h: item.h,
      falling: false, dead: false
    };
    g.cellRef = { type: -1, garbage: g, state: IDLE, chain: false, sprite: null };
    for (let r = g.row; r < g.row + g.h; r++) {
      for (let c = g.col; c < g.col + g.w; c++) this.grid[r][c] = g.cellRef;
    }

    const cont = this.scene.add.container(this.garbX(g), -((g.h + 2.2) * this.cell));
    const tile = this.scene.add.tileSprite(0, 0, g.w * 96, g.h * 96, 'garbage')
      .setOrigin(0, 0).setScale(this.cell / 96);
    const face = this.scene.add.text(g.w * this.cell / 2, g.h * this.cell / 2, '😈', {
      fontSize: Math.round(this.cell * 0.5) + 'px'
    }).setOrigin(0.5);
    cont.add([tile, face]);
    this.blockLayer.add(cont);
    g.rect = cont;
    this.garbages.push(g);

    g.falling = true;
    this.garbFalling++;
    this.scene.tweens.add({
      targets: cont, y: this.garbY(g),
      duration: 380, ease: 'Quad.in',
      onComplete: () => {
        g.falling = false;
        this.garbFalling--;
        sfx.garbage();
        this.scene.cameras.main.shake(120, 0.004);
        this.applyGravity(false);
      }
    });
  }

  transformGarbage(clearedCoords) {
    if (!this.garbages.length || !clearedCoords.length) return;
    const hitSet = new Set();
    const touches = (g, r, c) =>
      r >= g.row - 1 && r <= g.row + g.h && c >= g.col - 1 && c <= g.col + g.w &&
      // orthogonal adjacency only (not diagonal corners)
      !((r < g.row || r >= g.row + g.h) && (c < g.col || c >= g.col + g.w));

    let added = true;
    const live = this.garbages.filter(g => !g.dead && !g.falling);
    while (added) {
      added = false;
      for (const g of live) {
        if (hitSet.has(g)) continue;
        let hit = clearedCoords.some(([r, c]) => touches(g, r, c));
        if (!hit) {
          // spread through touching garbage
          for (const og of hitSet) {
            const overlapC = g.col <= og.col + og.w && og.col <= g.col + g.w;
            const overlapR = g.row <= og.row + og.h && og.row <= g.row + g.h;
            if (overlapC && overlapR) { hit = true; break; }
          }
        }
        if (hit) { hitSet.add(g); added = true; }
      }
    }

    for (const g of hitSet) this.convertGarbageRow(g);
  }

  convertGarbageRow(g) {
    const row = g.row;
    // free the bottom row and fill with fresh blocks (they carry chain flags)
    for (let c = g.col; c < g.col + g.w; c++) {
      this.grid[row][c] = null;
      const t = this.randTypeAvoiding(row, c);
      const b = this.makeBlock(t, row, c);
      b.chain = true;
      b.sprite.setScale(0.01);
      this.scene.tweens.add({ targets: b.sprite, scale: this.cell / 96, duration: 160, ease: 'Back.out' });
      this.grid[row][c] = b;
    }
    this.burst(this.cellX(g.col) + (g.w - 1) * this.cell / 2, this.cellY(row), -1);

    g.h -= 1;
    if (g.h <= 0) {
      g.dead = true;
      g.rect.destroy();
      this.garbages = this.garbages.filter(x => x !== g);
    } else {
      g.row += 1;
      for (let r = g.row; r < g.row + g.h; r++) {
        for (let c = g.col; c < g.col + g.w; c++) this.grid[r][c] = g.cellRef;
      }
      const tile = g.rect.list[0];
      tile.setSize(g.w * 96, g.h * 96);
      const face = g.rect.list[1];
      face.setPosition(g.w * this.cell / 2, g.h * this.cell / 2);
      g.rect.y = this.garbY(g);
    }
  }

  // ---------------------------------------------------------------- rising
  topOccupied() {
    for (let c = 0; c < COLS; c++) if (this.grid[ROWS - 1][c]) return true;
    return false;
  }

  stackHeight() {
    let max = 0;
    for (let c = 0; c < COLS; c++) {
      for (let r = ROWS - 1; r >= 0; r--) {
        if (this.grid[r][c]) { max = Math.max(max, r + 1); break; }
      }
    }
    return max;
  }

  commitRow() {
    // shift every logical row up by one
    const newRow = [];
    for (let c = 0; c < COLS; c++) {
      const b = this.makeBlock(this.nextRow[c], 0, c);
      // replace dim preview sprite with the real one
      this.nextSprites[c].destroy();
      newRow.push(b);
    }
    this.grid.pop(); // top row (must be empty)
    this.grid.unshift(newRow);

    // reposition every sprite to its new logical row
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const b = this.grid[r][c];
        if (b && b.sprite && !b.garbage && b.state === IDLE) {
          b.sprite.y = this.cellY(r);
          b.sprite.x = this.cellX(c);
        }
      }
    }
    for (const g of this.garbages) {
      if (!g.dead) { g.row += 1; g.rect.y = this.garbY(g); }
    }

    this.riseProgress = 0;
    this.blockLayer.y = 0;
    this.cursorR = Math.min(this.cursorR + 1, ROWS - 1);
    this.rowsRaised++;
    this.score += 1;
    this.onScore(this.score);
    this.makeNextRow();
    this.checkAllMatches();
  }

  forceRaise(active) {
    this.manualRaise = active;
  }

  // ---------------------------------------------------------------- update
  update(dt) {
    if (this.over || this.paused || this.destroyed) return;

    this.garbageCooldown = Math.max(0, this.garbageCooldown - dt);
    this.trySpawnGarbage();

    const busy = this.activeClears > 0 || this.fallingCount > 0 || this.garbFalling > 0 || this.swapCount > 0;
    const full = this.topOccupied();

    if (this.stopTimer > 0 && !this.manualRaise) {
      this.stopTimer -= dt;
    } else if (!busy && !full) {
      const interval = this.manualRaise ? 140 : this.riseInterval;
      this.riseProgress += dt / interval;
      if (this.manualRaise) this.score += 0; // manual raise is its own reward
      if (this.riseProgress >= 1) {
        this.riseProgress = 0.999; // commit below, after danger check
        this.commitRow();
      }
    }

    // danger / top-out
    if (full && !busy && this.stopTimer <= 0) {
      this.dangerTimer += dt;
      if (Math.floor(this.dangerTimer / 300) !== Math.floor((this.dangerTimer - dt) / 300)) {
        if (!this.quiet) sfx.danger();
      }
      this.container.x = this.x + Math.sin(this.dangerTimer / 28) * 3;
      if (this.dangerTimer >= this.graceMs) {
        this.lose();
        return;
      }
    } else if (!full) {
      this.dangerTimer = 0;
      this.container.x = this.x;
    }

    this.blockLayer.y = -this.riseProgress * this.cell;

    // chain ends when the board settles
    if (this.chainLevel > 1 && !busy) {
      let flagged = false;
      for (let r = 0; r < ROWS && !flagged; r++) {
        for (let c = 0; c < COLS; c++) {
          const b = this.grid[r][c];
          if (b && b.chain) { flagged = true; break; }
        }
      }
      if (!flagged) {
        const level = this.chainLevel;
        this.chainLevel = 1;
        this.onAttack({ type: 'chain', level });
      }
    }

    // cursor
    this.cursor.setPosition(this.cursorC * this.cell, (ROWS - 1 - this.cursorR) * this.cell);
    const pulse = 1 + Math.sin(this.scene.time.now / 180) * 0.02;
    this.cursor.setScale((this.cell / 96) * pulse);

    // danger tint on top rows
    const danger = this.stackHeight() >= ROWS - 2;
    this.frame.setStrokeStyle(4, danger ? 0xd23f3f : 0x4a4a8a);
  }

  lose() {
    if (this.over) return;
    this.over = true;
    this.container.x = this.x;
    // gray out
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const b = this.grid[r][c];
        if (b && b.sprite) b.sprite.setTint(0x777788);
      }
    }
    for (const g of this.garbages) if (!g.dead) g.rect.list[0].setTint(0x777788);
    this.onGameOver();
  }

  setPaused(p) { this.paused = p; }

  destroy() {
    this.destroyed = true;
    if (this.zone) this.zone.destroy();
    this.maskGfx.destroy();
    this.container.destroy(true);
  }
}
