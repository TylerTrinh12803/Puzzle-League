import { DIFFS } from './constants.js';

// Local leaderboards: top 8 per MODE per DIFFICULTY, saved in localStorage.
// modes: 'endless' | 'story' | 'pvp'
const KEY = 'pl_leaderboard_v2';
const MAX = 8;

export const LB_MODES = [
  { key: 'endless', label: '∞ ENDLESS' },
  { key: 'story', label: '⚔ STORY' },
  { key: 'pvp', label: '🎮 PVP' }
];

export function loadBoard() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return {};
}

function saveBoard(data) {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {}
}

function slot(data, mode, diffIdx) {
  const dk = DIFFS[diffIdx]?.key || 'easy';
  return `${mode}:${dk}`;
}

export function getScores(mode, diffIdx) {
  const data = loadBoard();
  return data[slot(data, mode, diffIdx)] || [];
}

export function qualifies(mode, diffIdx, score) {
  if (score <= 0) return false;
  const list = getScores(mode, diffIdx);
  if (list.length < MAX) return true;
  return score > list[list.length - 1].score;
}

// returns 1-based rank after insertion
export function addScore(mode, diffIdx, name, score) {
  const data = loadBoard();
  const k = slot(data, mode, diffIdx);
  const list = data[k] || [];
  const entry = { name, score, t: Date.now() };
  list.push(entry);
  list.sort((a, b) => b.score - a.score || (a.t || 0) - (b.t || 0));
  data[k] = list.slice(0, MAX);
  saveBoard(data);
  return data[k].indexOf(entry) + 1; // 0 if it fell off the list
}
