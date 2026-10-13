import { COLS, ROWS } from './constants.js';

/**
 * CPU opponent. Scans the board for swaps that create matches,
 * otherwise flattens the stack. Difficulty = act interval + mistake rate.
 */
export class AI {
  constructor(board, opts = {}) {
    this.board = board;
    this.interval = opts.interval || 700;   // ms between actions
    this.mistake = opts.mistake ?? 0.1;     // chance to fumble a turn
    this.useRaise = !!opts.raise;           // raises stack when it's low
    this.timer = this.interval * 0.5;
    this.pendingSwap = null;
    this.swapDelay = 0;
  }

  // matrix of types: -9 untouchable, -1 empty, >=0 idle block type
  snapshot() {
    const m = [];
    for (let r = 0; r < ROWS; r++) {
      const row = [];
      for (let c = 0; c < COLS; c++) {
        const b = this.board.grid[r][c];
        if (!b) row.push(-1);
        else if (b.garbage || b.state !== 0) row.push(-9);
        else row.push(b.type);
      }
      m.push(row);
    }
    return m;
  }

  matchSizeAt(m, r, c) {
    const t = m[r][c];
    if (t < 0) return 0;
    let h = 1;
    for (let x = c - 1; x >= 0 && m[r][x] === t; x--) h++;
    for (let x = c + 1; x < COLS && m[r][x] === t; x++) h++;
    let v = 1;
    for (let y = r - 1; y >= 0 && m[y][c] === t; y--) v++;
    for (let y = r + 1; y < ROWS && m[y][c] === t; y++) v++;
    let size = 0;
    if (h >= 3) size += h;
    if (v >= 3) size += v;
    return size;
  }

  hasSupport(m, r, c) {
    // a block swapped into (r,c) will stay there only if supported
    return r === 0 || m[r - 1][c] !== -1;
  }

  findMatchSwap() {
    const m = this.snapshot();
    let best = null;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS - 1; c++) {
        const a = m[r][c], b = m[r][c + 1];
        if (a === -9 || b === -9) continue;
        if (a === b) continue;
        if (a === -1 && b === -1) continue;
        // simulate
        m[r][c] = b; m[r][c + 1] = a;
        let score = 0;
        if (m[r][c] >= 0 && this.hasSupport(m, r, c)) score = Math.max(score, this.matchSizeAt(m, r, c));
        if (m[r][c + 1] >= 0 && this.hasSupport(m, r, c + 1)) score = Math.max(score, this.matchSizeAt(m, r, c + 1));
        m[r][c] = a; m[r][c + 1] = b;
        if (score >= 3) {
          const jitteredScore = score + Math.random() * 0.5;
          if (!best || jitteredScore > best.score) best = { r, c, score: jitteredScore };
        }
      }
    }
    return best;
  }

  findFlattenSwap() {
    const m = this.snapshot();
    const heights = [];
    for (let c = 0; c < COLS; c++) {
      let h = 0;
      for (let r = ROWS - 1; r >= 0; r--) {
        if (m[r][c] !== -1) { h = r + 1; break; }
      }
      heights.push(h);
    }
    let tall = 0, short = 0;
    for (let c = 1; c < COLS; c++) {
      if (heights[c] > heights[tall]) tall = c;
      if (heights[c] < heights[short]) short = c;
    }
    if (heights[tall] - heights[short] < 2) return null;
    // move the top block of the tall column one step toward the short column
    const r = heights[tall] - 1;
    if (r < 0) return null;
    const dir = short < tall ? -1 : 1;
    const c = dir === -1 ? tall - 1 : tall;
    if (c < 0 || c > COLS - 2) return null;
    const a = this.board.grid[r][c], b = this.board.grid[r][c + 1];
    const movable = (x) => !x || (x.state === 0 && !x.garbage);
    if (!movable(a) || !movable(b)) return null;
    if (!a && !b) return null;
    return { r, c };
  }

  update(dt) {
    const board = this.board;
    if (board.over || board.paused) return;

    // committing a queued swap slightly after moving the cursor looks natural
    if (this.pendingSwap) {
      this.swapDelay -= dt;
      if (this.swapDelay <= 0) {
        board.trySwapAt(this.pendingSwap.r, this.pendingSwap.c);
        this.pendingSwap = null;
      }
      return;
    }

    this.timer -= dt;
    if (this.timer > 0) return;
    this.timer = this.interval * (0.75 + Math.random() * 0.5);

    if (Math.random() < this.mistake) return; // fumbled turn

    const move = this.findMatchSwap() || this.findFlattenSwap();
    if (move) {
      board.setCursor(move.r, move.c);
      this.pendingSwap = move;
      this.swapDelay = 110;
    } else if (this.useRaise && board.stackHeight() < 5 && board.garbageQueue.length === 0) {
      board.riseProgress = Math.min(board.riseProgress + 0.5, 0.98);
    }
  }
}
