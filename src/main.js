import { GAME_W, GAME_H } from './constants.js';
import { Boot } from './scenes/Boot.js';
import { Menu } from './scenes/Menu.js';
import { DiffSelect } from './scenes/DiffSelect.js';
import { Endless } from './scenes/Endless.js';
import { Versus } from './scenes/Versus.js';
import { PvP } from './scenes/PvP.js';
import { Tutorial } from './scenes/Tutorial.js';
import { Leaderboard } from './scenes/Leaderboard.js';

const config = {
    type: Phaser.AUTO,
    title: 'Puzzle League',
    parent: 'game-container',
    width: GAME_W,
    height: GAME_H,
    backgroundColor: '#070312',
    pixelArt: false,
    scene: [Boot, Menu, DiffSelect, Endless, Versus, PvP, Tutorial, Leaderboard],
    input: { activePointers: 4 },
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    }
};

window.game = new Phaser.Game(config);
