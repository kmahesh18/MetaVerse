import * as Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';

export function createPhaserGame(parent: HTMLElement, roomId: string): Phaser.Game {
  // Use visualViewport for mobile to handle address bar / virtual keyboard
  const viewportWidth = typeof window !== 'undefined'
    ? (window.visualViewport?.width ?? window.innerWidth)
    : parent.clientWidth || 800;
  const viewportHeight = typeof window !== 'undefined'
    ? (window.visualViewport?.height ?? window.innerHeight)
    : parent.clientHeight || 600;

  const game = new Phaser.Game({
    type: Phaser.CANVAS,
    parent,
    width: viewportWidth,
    height: viewportHeight,
    pixelArt: true,
    backgroundColor: '#1a1a1a',
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
      parent,
    },
    scene: [BootScene, GameScene],
    render: {
      antialias: false,
      roundPixels: true,
    },
    input: {
      touch: true,
      activePointers: 3,
    },
    audio: {
      noAudio: true,
    },
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
