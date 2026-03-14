import * as Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';

export function createPhaserGame(parent: HTMLElement, roomId: string): Phaser.Game {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: parent.clientWidth,
    height: parent.clientHeight,
    pixelArt: true,
    backgroundColor: '#1a1a2e',
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false,
      },
    },
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [BootScene, GameScene],
  });

  // Pass roomId via game registry so scenes can access it
  game.registry.set('roomId', roomId);

  if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
    (window as Window & { __METAVERSE_GAME__?: Phaser.Game }).__METAVERSE_GAME__ = game;
    game.events.once(Phaser.Core.Events.DESTROY, () => {
      const runtimeWindow = window as Window & { __METAVERSE_GAME__?: Phaser.Game };
      if (runtimeWindow.__METAVERSE_GAME__ === game) {
        delete runtimeWindow.__METAVERSE_GAME__;
      }
    });
  }

  return game;
}
