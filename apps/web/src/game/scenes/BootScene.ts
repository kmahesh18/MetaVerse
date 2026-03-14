import * as Phaser from 'phaser';
import { CURATED_WORLD_ASSETS } from '@metaverse/shared';
import { DEFAULT_CHARACTER_MANIFEST } from '../character-manifest';

// Character names mapped to sprite indices
const CHARACTER_NAMES = ['adam', 'alex', 'amelia', 'bob'] as const;

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    // Character sprites — 4 characters, each with idle (16×32×4) + run (16×32×24)
    for (const name of CHARACTER_NAMES) {
      this.load.spritesheet(`${name}_idle`, `/assets/characters/${name}_idle.png`, {
        frameWidth: 16,
        frameHeight: 32,
      });
      this.load.spritesheet(`${name}_run`, `/assets/characters/${name}_run.png`, {
        frameWidth: 16,
        frameHeight: 32,
      });
      this.load.spritesheet(`${name}_sit`, `/assets/characters/${name}_sit.png`, {
        frameWidth: 16,
        frameHeight: 32,
      });
    }

    // Tilesets
    this.load.spritesheet('room_builder', '/assets/tiles/room_builder.png', {
      frameWidth: 16,
      frameHeight: 16,
    });
    this.load.spritesheet('interiors', '/assets/tiles/interiors.png', {
      frameWidth: 16,
      frameHeight: 16,
    });
    this.load.spritesheet('tiny_town', '/assets/tiles/tiny_town.png', {
      frameWidth: 16,
      frameHeight: 16,
    });
    this.load.spritesheet('tiny_dungeon', '/assets/tiles/tiny_dungeon.png', {
      frameWidth: 16,
      frameHeight: 16,
    });

    const loadedImages = new Set<string>();
    for (const asset of CURATED_WORLD_ASSETS) {
      for (const renderable of asset.renderables) {
        if (renderable.kind === 'image' && !loadedImages.has(renderable.key)) {
          this.load.image(renderable.key, renderable.src);
          loadedImages.add(renderable.key);
        }
      }
    }

    // Progress bar
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const bar = this.add.graphics();
    const box = this.add.graphics();
    box.fillStyle(0x222222, 0.8);
    box.fillRect(width / 2 - 100, height / 2 - 15, 200, 30);

    this.load.on('progress', (value: number) => {
      bar.clear();
      bar.fillStyle(0x6366f1, 1);
      bar.fillRect(width / 2 - 96, height / 2 - 11, 192 * value, 22);
    });

    this.load.on('complete', () => {
      bar.destroy();
      box.destroy();
    });
  }

  create() {
    // Create character animations from an explicit manifest instead of assuming frame order.
    for (const name of CHARACTER_NAMES) {
      const idleKey = `${name}_idle`;
      const runKey = `${name}_run`;
      const manifest = DEFAULT_CHARACTER_MANIFEST;

      this.anims.create({
        key: `${name}_idle_down`,
        frames: [{ key: idleKey, frame: manifest.idle.down }],
        frameRate: 1,
      });
      this.anims.create({
        key: `${name}_idle_right`,
        frames: [{ key: idleKey, frame: manifest.idle.right }],
        frameRate: 1,
      });
      this.anims.create({
        key: `${name}_idle_up`,
        frames: [{ key: idleKey, frame: manifest.idle.up }],
        frameRate: 1,
      });
      this.anims.create({
        key: `${name}_idle_left`,
        frames: [{ key: idleKey, frame: manifest.idle.left }],
        frameRate: 1,
      });

      this.anims.create({
        key: `${name}_walk_down`,
        frames: this.anims.generateFrameNumbers(runKey, manifest.walk.down),
        frameRate: 10,
        repeat: -1,
      });
      this.anims.create({
        key: `${name}_walk_right`,
        frames: this.anims.generateFrameNumbers(runKey, manifest.walk.right),
        frameRate: 10,
        repeat: -1,
      });
      this.anims.create({
        key: `${name}_walk_up`,
        frames: this.anims.generateFrameNumbers(runKey, manifest.walk.up),
        frameRate: 10,
        repeat: -1,
      });
      this.anims.create({
        key: `${name}_walk_left`,
        frames: this.anims.generateFrameNumbers(runKey, manifest.walk.left),
        frameRate: 10,
        repeat: -1,
      });

      this.anims.create({
        key: `${name}_sit_down`,
        frames: this.anims.generateFrameNumbers(`${name}_sit`, manifest.sit.down),
        frameRate: 6,
        repeat: -1,
      });
      this.anims.create({
        key: `${name}_sit_right`,
        frames: this.anims.generateFrameNumbers(`${name}_sit`, manifest.sit.right),
        frameRate: 6,
        repeat: -1,
      });
      this.anims.create({
        key: `${name}_sit_up`,
        frames: this.anims.generateFrameNumbers(`${name}_sit`, manifest.sit.up),
        frameRate: 6,
        repeat: -1,
      });
      this.anims.create({
        key: `${name}_sit_left`,
        frames: this.anims.generateFrameNumbers(`${name}_sit`, manifest.sit.left),
        frameRate: 6,
        repeat: -1,
      });
    }

    this.scene.start('GameScene');
  }
}
