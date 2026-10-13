// Original creatures & rivals (Pokémon characters are Nintendo's, so meet the Puzzle Pals!)
export const PLAYER = {
  name: 'You',
  emoji: '🧑‍🚀',
  team: [
    { name: 'Ember', emoji: '🦊' },
    { name: 'Ripple', emoji: '🐸' },
    { name: 'Peep', emoji: '🐤' }
  ]
};

export const RIVALS = [
  {
    name: 'Fern',
    title: 'Forest Scout',
    emoji: '🧝‍♀️',
    color: 0x43aa4b,
    taunt: 'The forest taught me patience... and PUZZLES!',
    winLine: 'Wow, your chains are amazing!',
    loseLine: 'Hehe! Train harder and try again!',
    ai: { interval: 1000, mistake: 0.28, raise: false },
    riseInterval: 11000,
    team: [
      { name: 'Nibbler', emoji: '🐛' },
      { name: 'Bramble', emoji: '🦔' },
      { name: 'Hoots', emoji: '🦉' }
    ]
  },
  {
    name: 'Marina',
    title: 'Tide Tamer',
    emoji: '🧜‍♀️',
    color: 0x2986cc,
    taunt: 'My combos flow like the tide. Can you keep up?',
    winLine: 'Unbelievable... you swim faster than my Finn!',
    loseLine: 'Splash! Come back when you can chain x3!',
    ai: { interval: 640, mistake: 0.13, raise: true },
    riseInterval: 9000,
    team: [
      { name: 'Inky', emoji: '🐙' },
      { name: 'Shelldon', emoji: '🐢' },
      { name: 'Finn', emoji: '🦈' }
    ]
  },
  {
    name: 'Volt',
    title: 'Storm Champion',
    emoji: '🦹‍♂️',
    color: 0xf3a712,
    taunt: 'I am the CHAMPION! Show me a REAL chain!',
    winLine: 'Impossible! The title... is yours. CHAMPION!',
    loseLine: 'ZAP! Not even close. Sharpen those chains!',
    ai: { interval: 420, mistake: 0.05, raise: true },
    riseInterval: 7200,
    team: [
      { name: 'Zapwing', emoji: '🦅' },
      { name: 'Drakon', emoji: '🐲' },
      { name: 'Boltmane', emoji: '🦁' }
    ]
  }
];

// combo size -> garbage width sent (height 1)
export function comboGarbage(size) {
  if (size >= 8) return [{ w: 6, h: 1 }, { w: 4, h: 1 }];
  if (size >= 7) return [{ w: 6, h: 1 }];
  if (size >= 6) return [{ w: 5, h: 1 }];
  if (size >= 5) return [{ w: 4, h: 1 }];
  if (size >= 4) return [{ w: 3, h: 1 }];
  return [];
}

// chain level -> full-width garbage height
export function chainGarbage(level) {
  if (level <= 1) return [];
  return [{ w: 6, h: Math.min(level - 1, 4) }];
}
