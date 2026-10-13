// Shared constants for Puzzle League
export const GAME_W = 720;
export const GAME_H = 1280;

export const COLS = 6;
export const ROWS = 12;
export const NTYPES = 6;

// panel colors: red, yellow, green, cyan, purple, blue
export const COLORS = [0xe4572e, 0xf3a712, 0x43aa4b, 0x29b6c5, 0x8e6bbf, 0x3a6fd8];
export const COLORS_LIGHT = [0xf28f6b, 0xf8c95c, 0x7fd486, 0x74d7e2, 0xb9a1de, 0x82a4ec];
export const SYMBOLS = ['heart', 'star', 'diamond', 'circle', 'triangle', 'drop'];

// difficulty tiers: rise = ms per row at start, aiMul scales NPC act interval down,
// mistakeMul scales NPC fumble rate down, levelMs = endless speed-up interval,
// levelFactor = endless rise multiplier per speed level
export const DIFFS = [
  { key: 'easy',    name: 'EASY',    color: 0x43aa4b, rise: 6600, aiMul: 1.00, mistakeMul: 1.0, levelMs: 22000, levelFactor: 0.90, aiRaise: false },
  { key: 'medium',  name: 'MEDIUM',  color: 0x29b6c5, rise: 5400, aiMul: 0.78, mistakeMul: 0.7, levelMs: 20000, levelFactor: 0.89, aiRaise: false },
  { key: 'hard',    name: 'HARD',    color: 0xf3a712, rise: 4400, aiMul: 0.58, mistakeMul: 0.45, levelMs: 18000, levelFactor: 0.88, aiRaise: true },
  { key: 'expert',  name: 'EXPERT',  color: 0xe4572e, rise: 3600, aiMul: 0.44, mistakeMul: 0.28, levelMs: 16000, levelFactor: 0.87, aiRaise: true },
  { key: 'extreme', name: 'EXTREME', color: 0xc22e6e, rise: 2950, aiMul: 0.33, mistakeMul: 0.14, levelMs: 14000, levelFactor: 0.86, aiRaise: true },
  { key: 'master',  name: 'MASTER',  color: 0x8e6bbf, rise: 2400, aiMul: 0.24, mistakeMul: 0.05, levelMs: 12000, levelFactor: 0.85, aiRaise: true }
];

export const UI = {
  bg: 0x0a0820,
  panel: 0x161335,
  panelLine: 0x4a4a8a,
  text: '#ffffff',
  dim: '#9d9ac4',
  accent: '#ffd94a',
  font: 'Arial Black, Arial, sans-serif'
};
