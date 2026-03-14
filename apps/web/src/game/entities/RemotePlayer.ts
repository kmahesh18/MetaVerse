import * as Phaser from 'phaser';
import type { DirectionType } from '@metaverse/shared';

export class RemotePlayer {
  public sprite: Phaser.Physics.Arcade.Sprite;
  private nameText: Phaser.GameObjects.Text;
  private charName: string;
  private targetX: number;
  private targetY: number;
  private currentAnim = '';

  constructor(
    private scene: Phaser.Scene,
    x: number,
    y: number,
    charName: string,
    displayName: string
  ) {
    this.charName = charName;
    this.sprite = scene.physics.add.sprite(x, y, `${charName}_idle`, 0);
    this.sprite.setDepth(9);
    this.targetX = x;
    this.targetY = y;

    this.nameText = scene.add.text(x, y - 20, displayName, {
      fontSize: '6px',
      color: '#ffffff',
      backgroundColor: '#00000088',
      padding: { x: 2, y: 1 },
      align: 'center',
    });
    this.nameText.setOrigin(0.5, 1);
    this.nameText.setDepth(11);
  }

  moveTo(x: number, y: number, direction: DirectionType) {
    this.targetX = x;
    this.targetY = y;

    const dx = x - this.sprite.x;
    const dy = y - this.sprite.y;
    const isMoving = Math.abs(dx) > 1 || Math.abs(dy) > 1;

    const animKey = isMoving
      ? `${this.charName}_walk_${direction}`
      : `${this.charName}_idle_${direction}`;

    if (animKey !== this.currentAnim) {
      this.sprite.play(animKey, true);
      this.currentAnim = animKey;
    }
  }

  setPose(direction: DirectionType, pose: 'idle' | 'walk' | 'sit') {
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

  update() {
    // Interpolate toward target
    const lerpFactor = 0.15;
    const dx = this.targetX - this.sprite.x;
    const dy = this.targetY - this.sprite.y;

    if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
      this.sprite.x += dx * lerpFactor;
      this.sprite.y += dy * lerpFactor;
    } else {
      this.sprite.x = this.targetX;
      this.sprite.y = this.targetY;
      // Switch to idle when arrived
      if (this.currentAnim.includes('walk')) {
        const dir = this.currentAnim.split('_').pop() as DirectionType;
        const idleKey = `${this.charName}_idle_${dir}`;
        this.sprite.play(idleKey, true);
        this.currentAnim = idleKey;
      }
    }

    // Name tag follows sprite
    this.nameText.setPosition(this.sprite.x, this.sprite.y - 20);
    this.sprite.setDepth(this.sprite.y + 17);
    this.nameText.setDepth(this.sprite.depth + 1);
  }

  destroy() {
    this.sprite.destroy();
    this.nameText.destroy();
  }
}
