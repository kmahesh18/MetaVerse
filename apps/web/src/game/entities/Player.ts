import * as Phaser from 'phaser';
import type { DirectionType } from '@metaverse/shared';

export class Player {
  public sprite: Phaser.Physics.Arcade.Sprite;
  private charName: string;
  private currentAnim = '';

  constructor(scene: Phaser.Scene, x: number, y: number, charName: string) {
    this.charName = charName;
    // Use idle sheet for initial sprite, frame 0 = facing down
    this.sprite = scene.physics.add.sprite(x, y, `${charName}_idle`, 0);
    this.sprite.setDepth(10);
    this.sprite.setCollideWorldBounds(false);
    this.sprite.body?.setSize(12, 10);
    this.sprite.body?.setOffset(2, 22);
  }

  setVelocity(vx: number, vy: number) {
    this.sprite.setVelocity(vx, vy);
  }

  updateDepth() {
    this.sprite.setDepth(this.sprite.y + 18);
  }

  playAnimation(direction: DirectionType, pose: 'idle' | 'walk' | 'sit') {
    const animKey =
      pose === 'sit'
        ? `${this.charName}_sit_${direction}`
        : pose === 'walk'
          ? `${this.charName}_walk_${direction}`
          : `${this.charName}_idle_${direction}`;

    if (animKey !== this.currentAnim) {
      this.sprite.play(animKey, true);
      this.currentAnim = animKey;
    }
  }

  destroy() {
    this.sprite.destroy();
  }
}
