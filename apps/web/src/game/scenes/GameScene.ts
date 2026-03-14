import * as Phaser from 'phaser';
import { CURATED_WORLD_ASSET_MAP, TILE_SIZE, MOVEMENT_EMIT_INTERVAL, PLAYER_SPEED } from '@metaverse/shared';
import type { CuratedWorldAsset, DirectionType } from '@metaverse/shared';
import { Player } from '../entities/Player';
import { RemotePlayer } from '../entities/RemotePlayer';
import { useGameStore } from '@/lib/game-store';
import { useAuthStore } from '@/lib/auth-store';
import { getSocket } from '@/lib/socket';

const CHARACTER_NAMES = ['adam', 'alex', 'amelia', 'bob'] as const;
const WALL_TILE = 215;
const TRIM_TILE = 220;
const SHADOW_TILE = 151;
const LOBBY_TILE_A = 328;
const LOBBY_TILE_B = 117;
const WOOD_TILE_A = 211;
const WOOD_TILE_B = 212;
const WOOD_TILE_C = 213;
const HERRINGBONE_A = 232;
const HERRINGBONE_B = 233;
const HERRINGBONE_C = 234;
const QUIET_TILE_A = 216;
const QUIET_TILE_B = 217;
const QUIET_TILE_C = 218;

type GameSnapshot = ReturnType<typeof useGameStore.getState>;
type WorldRoom = NonNullable<GameSnapshot['room']>;
type WorldObject = GameSnapshot['roomObjects'][number];

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private remotePlayers = new Map<string, RemotePlayer>();
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private standKey?: Phaser.Input.Keyboard.Key;
  private lastEmitTime = 0;
  private lastDirection: DirectionType = 'down';
  private wasMoving = false;
  private obstacleBodies?: Phaser.Physics.Arcade.StaticGroup;
  private room?: WorldRoom;
  private resizeHandler?: () => void;

  constructor() {
    super({ key: 'GameScene' });
  }

  create() {
    const room = useGameStore.getState().room;
    if (!room) {
      this.add.text(32, 32, 'Room data missing', { color: '#ffffff', fontSize: '16px' });
      return;
    }

    this.room = room;
    this.physics.world.setBounds(
      0,
      0,
      room.mapConfig.width * TILE_SIZE,
      room.mapConfig.height * TILE_SIZE
    );
    this.drawRoomShell(room);

    this.obstacleBodies = this.physics.add.staticGroup();
    this.renderRoomObjects(useGameStore.getState().roomObjects);

    const user = useAuthStore.getState().user;
    const localState = useGameStore.getState().localPlayer;
    const spawn = room.mapConfig.spawn ?? {
      x: Math.floor(room.mapConfig.width / 2),
      y: Math.floor(room.mapConfig.height / 2),
    };
    const startX = localState?.x ?? spawn.x * TILE_SIZE + TILE_SIZE / 2;
    const startY = localState?.y ?? spawn.y * TILE_SIZE + TILE_SIZE / 2;
    const avatarIdx = localState?.avatarIndex ?? user?.avatarConfig?.spriteIndex ?? 0;
    const charName = CHARACTER_NAMES[Math.min(avatarIdx, CHARACTER_NAMES.length - 1)] ?? 'adam';

    this.player = new Player(this, startX, startY, charName);
    this.player.sprite.setCollideWorldBounds(true);
    this.player.updateDepth();
    if (this.obstacleBodies) {
      this.physics.add.collider(this.player.sprite, this.obstacleBodies);
    }

    this.updateViewportLayout();
    this.cameras.main.setBackgroundColor(this.getBackdropColor(room));
    this.cameras.main.setRoundPixels(true);

    this.resizeHandler = () => {
      this.updateViewportLayout();
    };
    this.scale.on('resize', this.resizeHandler);

    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.standKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    }

    this.syncRemotePlayers();
  }

  private updateViewportLayout() {
    if (!this.room) return;

    const worldWidth = this.room.mapConfig.width * TILE_SIZE;
    const worldHeight = this.room.mapConfig.height * TILE_SIZE;
    const zoom = Math.min(this.scale.width / worldWidth, this.scale.height / worldHeight);

    this.cameras.main.setZoom(zoom);
    this.cameras.main.centerOn(worldWidth / 2, worldHeight / 2);
  }

  private getBackdropColor(room: WorldRoom): string {
    if (room.templateKey === 'garden-terrace') return '#9ec9c2';
    if (room.templateKey === 'play-lounge') return '#4f3942';
    if (room.templateKey === 'focus-library') return '#2f3842';
    return '#1e2532';
  }

  private placeFloorTile(x: number, y: number, frame: number, sheet = 'room_builder', depth = 0) {
    this.add
      .image(x * TILE_SIZE + TILE_SIZE / 2, y * TILE_SIZE + TILE_SIZE / 2, sheet, frame)
      .setDepth(depth);
  }

  private fillArea(x0: number, y0: number, width: number, height: number, frames: number[], sheet = 'room_builder', depth = 0) {
    for (let y = y0; y < y0 + height; y += 1) {
      for (let x = x0; x < x0 + width; x += 1) {
        const frame = frames[(x + y) % frames.length] ?? frames[0] ?? 0;
        this.placeFloorTile(x, y, frame, sheet, depth);
      }
    }
  }

  private drawRoomShell(room: WorldRoom) {
    const width = room.mapConfig.width;
    const height = room.mapConfig.height;
    const theme = room.mapConfig.backgroundTileId;

    if (theme === 'garden-terrace') {
      this.fillArea(0, 0, width, height, [1, 2], 'tiny_town');
      this.fillArea(14, 9, 12, 6, [36, 37, 38, 39], 'tiny_town', 0.1);
      this.fillArea(0, height - 3, width, 3, [12, 13, 14], 'tiny_town');
      this.fillArea(0, 0, width, 2, [40, 41, 42], 'tiny_town', 0.05);
    } else if (theme === 'warm-lobby') {
      this.fillArea(0, 0, width, height, [LOBBY_TILE_A, LOBBY_TILE_B]);
      this.fillArea(14, 0, 10, height, [HERRINGBONE_A, HERRINGBONE_B, HERRINGBONE_C], 'room_builder', 0.05);
    } else if (theme === 'sunlit-office') {
      this.fillArea(0, 0, width, height, [WOOD_TILE_A, WOOD_TILE_B, WOOD_TILE_C]);
      this.fillArea(19, 0, 6, height, [208, 209, 210], 'room_builder', 0.05);
    } else if (theme === 'calm-meeting') {
      this.fillArea(0, 0, width, height, [LOBBY_TILE_B, SHADOW_TILE]);
      this.fillArea(10, 6, 12, 8, [208, 209, 210], 'room_builder', 0.05);
    } else if (theme === 'play-lounge') {
      this.fillArea(0, 0, width, height, [WOOD_TILE_A, WOOD_TILE_B, HERRINGBONE_A]);
      this.fillArea(10, 5, 14, 10, [HERRINGBONE_A, HERRINGBONE_B, HERRINGBONE_C], 'room_builder', 0.05);
    } else {
      this.fillArea(0, 0, width, height, [QUIET_TILE_A, QUIET_TILE_B, QUIET_TILE_C]);
      this.fillArea(10, 4, 12, 10, [208, 209, 210], 'room_builder', 0.05);
    }

    for (let x = 0; x < width; x += 1) {
      this.placeFloorTile(x, 0, TRIM_TILE);
      this.placeFloorTile(x, height - 1, TRIM_TILE);
    }
    for (let y = 0; y < height; y += 1) {
      this.placeFloorTile(0, y, WALL_TILE, 'room_builder', 0.15);
      this.placeFloorTile(width - 1, y, WALL_TILE, 'room_builder', 0.15);
    }
  }

  private renderRoomObjects(objects: WorldObject[]) {
    for (const object of objects) {
      const slug = object.asset?.slug;
      if (!slug) continue;

      const asset = CURATED_WORLD_ASSET_MAP[slug];
      if (!asset) continue;

      const container = this.add.container(object.position.x, object.position.y);

      for (const renderable of asset.renderables) {
        if (renderable.kind === 'frame') {
          const sprite = this.add.image(
            renderable.offsetX + TILE_SIZE / 2,
            renderable.offsetY + TILE_SIZE / 2,
            renderable.sheet,
            renderable.frame
          );
          sprite.setDepth(object.position.y + renderable.offsetY + (renderable.depthOffset ?? 0));
          container.add(sprite);
        } else {
          const sprite = this.add.image(
            renderable.originX === 0 ? renderable.offsetX ?? 0 : asset.dimensions.widthTiles * TILE_SIZE / 2 + (renderable.offsetX ?? 0),
            renderable.originY === 0 ? renderable.offsetY ?? 0 : asset.dimensions.heightTiles * TILE_SIZE + (renderable.offsetY ?? 0),
            renderable.key
          );
          sprite.setOrigin(renderable.originX, renderable.originY);
          sprite.setDepth(object.position.y + asset.dimensions.heightTiles * TILE_SIZE + (renderable.depthOffset ?? 0));
          container.add(sprite);
        }
      }

      container.setDepth(object.position.y + asset.dimensions.heightTiles * TILE_SIZE + object.zIndex);

      if (object.isInteractive) {
        const zone = this.add.zone(
          object.position.x + asset.dimensions.widthTiles * TILE_SIZE / 2,
          object.position.y + asset.dimensions.heightTiles * TILE_SIZE / 2,
          asset.dimensions.widthTiles * TILE_SIZE,
          asset.dimensions.heightTiles * TILE_SIZE
        );
        zone.setInteractive({ useHandCursor: true });
        zone.on('pointerdown', () => this.handleInteraction(object, asset));
      }

      if (object.isObstacle && this.obstacleBodies) {
        const footprint = asset.obstacleFootprint ?? {
          x: 0,
          y: 0,
          widthTiles: asset.dimensions.widthTiles,
          heightTiles: asset.dimensions.heightTiles,
        };
        const body = this.add.rectangle(
          object.position.x + (footprint.x + footprint.widthTiles / 2) * TILE_SIZE,
          object.position.y + (footprint.y + footprint.heightTiles / 2) * TILE_SIZE,
          footprint.widthTiles * TILE_SIZE,
          footprint.heightTiles * TILE_SIZE,
          0x000000,
          0
        );
        this.physics.add.existing(body, true);
        this.obstacleBodies.add(body);
      }
    }
  }

  private handleInteraction(object: WorldObject, asset: CuratedWorldAsset) {
    const range = Phaser.Math.Distance.Between(
      this.player.sprite.x,
      this.player.sprite.y,
      object.position.x + asset.dimensions.widthTiles * TILE_SIZE / 2,
      object.position.y + asset.dimensions.heightTiles * TILE_SIZE / 2
    );

      if (range > TILE_SIZE * 4) {
      useGameStore.getState().setInteraction({
        objectId: object._id,
        title: object.asset?.name ?? 'Object',
        body: 'Move a little closer to use this object.',
        kind: 'hint',
      });
      return;
    }

    if (object.interactionType === 'teleport' && object.interactionData?.targetRoomId) {
      this.standFromSeat();
      useGameStore.getState().setInteraction(null);
      window.dispatchEvent(
        new CustomEvent('metaverse:teleport', {
          detail: { roomId: object.interactionData.targetRoomId },
        })
      );
      return;
    }

    if (object.interactionType === 'sit') {
      const seatedObjectId = useGameStore.getState().seatedObjectId;
      if (seatedObjectId === object._id) {
        this.standFromSeat();
        return;
      }

      getSocket()?.emit('player:sit', { objectId: object._id });
      useGameStore.getState().setSeatedObjectId(object._id);
      useGameStore.getState().setLocalPlayer({
        ...(useGameStore.getState().localPlayer ?? {
          userId: useAuthStore.getState().user?._id ?? 'me',
          x: this.player.sprite.x,
          y: this.player.sprite.y,
          direction: this.lastDirection,
          displayName: useAuthStore.getState().user?.displayName ?? 'You',
          avatarIndex: useAuthStore.getState().user?.avatarConfig?.spriteIndex ?? 0,
        }),
        isSitting: true,
        seatedObjectId: object._id,
      });
      useGameStore.getState().setInteraction({
        objectId: object._id,
        title: object.asset?.name ?? 'Seat',
        body: object.interactionData?.content ?? 'Take a moment here. Press Space or Stand to get moving again.',
        kind: 'sit',
      });
      return;
    }

    useGameStore.getState().setInteraction({
      objectId: object._id,
      title: object.interactionData?.content ?? object.asset?.name ?? 'Interaction',
      body:
        object.interactionData?.content ??
        `This ${object.asset?.name?.toLowerCase() ?? 'object'} adds texture to the room.`,
      kind: object.interactionType,
    });
  }

  private standFromSeat() {
    getSocket()?.emit('player:stand');
    useGameStore.getState().setSeatedObjectId(null);
    const localPlayer = useGameStore.getState().localPlayer;
    if (localPlayer) {
      useGameStore.getState().setLocalPlayer({
        ...localPlayer,
        isSitting: false,
        seatedObjectId: undefined,
      });
    }
  }

  private syncRemotePlayers() {
    const checkInterval = this.time.addEvent({
      delay: 50,
      loop: true,
      callback: () => {
        const { players } = useGameStore.getState();
        const user = useAuthStore.getState().user;

        for (const [userId, state] of players) {
          if (userId === user?._id) continue;

          const existing = this.remotePlayers.get(userId);
          if (existing) {
            existing.moveTo(state.x, state.y, state.direction);
            if (state.isSitting) {
              existing.setPose(state.direction, 'sit');
            }
          } else {
            const charName =
              CHARACTER_NAMES[Math.min(state.avatarIndex, CHARACTER_NAMES.length - 1)] ?? 'adam';
            const remote = new RemotePlayer(this, state.x, state.y, charName, state.displayName);
            remote.setPose(state.direction, state.isSitting ? 'sit' : 'idle');
            this.remotePlayers.set(userId, remote);
          }
        }

        for (const [userId, remote] of this.remotePlayers) {
          if (!players.has(userId)) {
            remote.destroy();
            this.remotePlayers.delete(userId);
          }
        }
      },
    });

    this.events.on('shutdown', () => {
      checkInterval.destroy();
      if (this.resizeHandler) {
        this.scale.off('resize', this.resizeHandler);
      }
    });
  }

  update(time: number) {
    if (!this.cursors || !this.room) return;

    const seatedObjectId = useGameStore.getState().seatedObjectId;
    if (seatedObjectId) {
      if (this.standKey && Phaser.Input.Keyboard.JustDown(this.standKey)) {
        this.standFromSeat();
      }
      this.player.setVelocity(0, 0);
      this.player.playAnimation(this.lastDirection, 'sit');
      this.player.updateDepth();
      for (const remote of this.remotePlayers.values()) {
        remote.update();
      }
      return;
    }

    const speed = PLAYER_SPEED * TILE_SIZE;
    let vx = 0;
    let vy = 0;
    let direction: DirectionType = this.lastDirection;

    if (this.cursors.left.isDown) {
      vx = -speed;
      direction = 'left';
    } else if (this.cursors.right.isDown) {
      vx = speed;
      direction = 'right';
    }

    if (this.cursors.up.isDown) {
      vy = -speed;
      direction = 'up';
    } else if (this.cursors.down.isDown) {
      vy = speed;
      direction = 'down';
    }

    const isMoving = vx !== 0 || vy !== 0;
    if (isMoving) {
      const normalized = new Phaser.Math.Vector2(vx, vy).normalize().scale(speed);
      vx = normalized.x;
      vy = normalized.y;
    }

    this.player.setVelocity(vx, vy);
    this.player.playAnimation(direction, isMoving ? 'walk' : 'idle');
    this.player.updateDepth();

    const socket = getSocket();
    if (socket && isMoving && time - this.lastEmitTime > MOVEMENT_EMIT_INTERVAL) {
      socket.emit('player:move', {
        x: Math.round(this.player.sprite.x),
        y: Math.round(this.player.sprite.y),
        direction,
      });
      useGameStore.getState().updateLocalPosition(
        Math.round(this.player.sprite.x),
        Math.round(this.player.sprite.y),
        direction
      );
      this.lastEmitTime = time;
    }

    if (!isMoving && this.wasMoving && socket) {
      socket.emit('player:stop', {
        x: Math.round(this.player.sprite.x),
        y: Math.round(this.player.sprite.y),
        direction,
      });
    }

    this.lastDirection = direction;
    this.wasMoving = isMoving;

    for (const remote of this.remotePlayers.values()) {
      remote.update();
    }
  }
}
