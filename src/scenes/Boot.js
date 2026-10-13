import { makeTextures } from '../textures.js';

export class Boot extends Phaser.Scene {
  constructor() { super('Boot'); }

  create() {
    makeTextures(this);

    // session progress: index of the next rival to fight
    if (!this.registry.has('rivalProgress')) this.registry.set('rivalProgress', 0);

    // best endless score (survives reloads when storage is available)
    let best = 0;
    try { best = parseInt(localStorage.getItem('pl_best') || '0', 10) || 0; } catch (e) {}
    this.registry.set('bestScore', best);

    this.scene.start('Menu');
  }
}
