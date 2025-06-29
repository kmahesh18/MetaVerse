import { Scene } from "phaser";
import { IAsset } from "../../../../server/src/Models/AssetModel";
import { types } from "mediasoup-client";

type PlayerPos = { posX: number; posY: number };

export class room extends Scene {
  // ✅ CORE IDENTIFIERS
  private clientId = "";
  private roomId = "";

  // ✅ NETWORKING
  private ws: WebSocket | null = null;
  private dataProducer: types.DataProducer | null = null;
  private dataConsumers: types.DataConsumer[] = [];

  // ✅ GAME STATE
  private currentPlayer: Phaser.GameObjects.Sprite | null = null;
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys | undefined;
  private currentDirection = "down";
  private playerPos: PlayerPos = { posX: 0, posY: 0 };
  private playerPositions = new Map<string, PlayerPos>();

  private userId = "";

  // ✅ ASSETS & RENDERING
  private roomAssets: IAsset[] = [];
  private playerAsset = new Map<string, string>();
  private gameObjects = new Map<string, Phaser.GameObjects.GameObject>();

  // ✅ CONSTANTS
  private readonly playerSpeed = 200;

  private proximityCircle: Phaser.GameObjects.Graphics | null = null;
  private showProximityCircle = false;

  constructor() {
    super({ key: "RoomScene" });
  }

  init(data: {
    userId: string;
    clientId: string;
    RoomId: string;
    ws: WebSocket;
    sendTransport: types.Transport;
    recvTransport: types.Transport;
    dataConsumers: types.DataConsumer[];
    dataProducer: types.DataProducer;
  }) {
    this.userId = data.userId;
    this.clientId = data.clientId;
    this.roomId = data.RoomId;
    this.ws = data.ws;
    this.dataProducer = data.dataProducer;
    this.dataConsumers = data.dataConsumers;

    if (!this.ws) {
      console.warn("no ws connection found ");
      return;
    }
    // if (this.ws) {
    //   this.ws.onmessage = async(event: MessageEvent) => {
    //     const msg = JSON.parse(event.data);
    //     console.log(msg);
    //     if(msg.type=="newDataProducer"){
    //       this.handleNewDataProducer(msg);
    //     }
    //     else if (msg.type === "dataConsumerCreated"){
    //       const { id, producerId, sctpStreamParameters, label, protocol } =msg.payload;
    //       if(!this.recvTransport){
    //         console.log("recv transport missing");
    //         return;
    //       }
				// 	const dataConsumer = await this.recvTransport.consumeData({
				// 		id,
				// 		dataProducerId: producerId,
				// 		sctpStreamParameters,
				// 		label,
				// 		protocol,
				// 	});
     
    //       this.addDataConsumer(dataConsumer);
    //     }
    //     else if (msg.type === "clientLeft") {
    //       console.log(this.gameObjects);
    //       this.gameObjects.delete(msg.clientId);
    //       console.log(this.gameObjects)
    //       console.log("deleted");
    //     }
        
    //   };
    // }
    console.log("🎮 Room init:", {
      userId: this.userId,
      clientId: this.clientId,
      roomId: this.roomId,
      dataProducer: this.dataProducer,
      dataConsumersCount: this.dataConsumers.length,
    });

    this.setupInitialDataConsumers();
  }

  preload() {
    console.log("🎮 Room scene preload started");
    
    // ✅ FIXED: Use proper backend URL
    const backendUrl = import.meta.env.VITE_BKPORT || 'http://localhost:5001';
    
    // Load room data
    this.load.json(
      "roomData",
      `${backendUrl}/api/rooms/${this.roomId}`,
    );
    
    this.load.once("filecomplete-json-roomData", (_key: string, _type: string, data: any) => {
      console.log("📦 Room data loaded:", data);
      if (data && data.assets) {
        data.assets.forEach((asset: IAsset) => {
          this.roomAssets.push(asset);
          this.load.image(asset.assetId, asset.previewUrl);
        });
      }
    });

    // Load player positions
    this.load.json(
      "playersData",
      `${backendUrl}/api/rooms/${this.roomId}/players`,
    );
    
    this.load.once("filecomplete-json-playersData", (_k: string, _t: string, data: any) => {
      console.log("👥 Players data loaded:", data);
      if (data) {
        this.playerPositions = new Map(Object.entries(data));
      }
    });

    // Load user avatars
    this.load.json(
      "userAvatarsData",
      `${backendUrl}/api/rooms/${this.roomId}/userAvatars`,
    );
    
    this.load.once("filecomplete-json-userAvatarsData", (_k: string, _t: string, data: any) => {
      console.log("🎭 User avatars data loaded:", data);
      if (data) {
        this.playerAsset = new Map(Object.entries(data));
        this.playerAsset.forEach((avatarName, userId) => {
          const url = `/assets/${avatarName}/${avatarName}_run.png`;
          console.log("📸 Loading spritesheet for user:", userId, url);
          this.load.spritesheet(userId, url, {
            frameWidth: 16,
            frameHeight: 32,
            startFrame: 0,
            endFrame: 23,
          });
        });
      }
    });

    // ✅ FIXED: Add error handling for failed loads
    this.load.on('loaderror', (file: any) => {
      console.error("❌ Failed to load file:", file.src);
    });

    this.load.on('complete', () => {
      console.log("✅ All assets loaded successfully");
    });
  }

  create() {
    console.log("🎮 Room scene create started");
    
    // ✅ EMIT: Scene creation event
    this.events.emit("create");
    this.game.events.emit("create-RoomScene");

    // ✅ FIXED: Add error handling for asset placement
    try {
      // Place room assets
      this.roomAssets.forEach((asset) => {
        try {
          this.placeAsset(asset);
        } catch (error) {
          console.error("❌ Error placing asset:", asset.assetId, error);
        }
      });

      // ✅ FIXED: Place player sprites - fix the forEach parameter
      this.playerAsset.forEach((avatarName, userId) => {
        try {
          const pos = this.playerPositions.get(userId) ?? { posX: 0, posY: 0 };
          this.playerPos = pos.posX === 0 && pos.posY === 0
            ? {
                posX: this.cameras.main.width / 2,
                posY: this.cameras.main.height / 2,
              }
            : pos;

          const sprite = this.add
            .sprite(this.playerPos.posX, this.playerPos.posY, userId, 0)
            .setDepth(2)
            .setScale(1.75);

          this.createAnimations(userId);
          this.gameObjects.set(userId, sprite);

          // Set current player reference
          if (userId === this.userId) {
            this.currentPlayer = sprite;
            console.log("👤 Current player sprite created:", userId);
          }
        } catch (error) {
          console.error("❌ Error creating player sprite:", userId, error);
        }
      });

      this.setupControls();
      this.setupDataProducer();
      this.setupInitialDataConsumers();
      
      console.log("✅ Room scene created successfully");
    } catch (error) {
      console.error("❌ Error in room scene create:", error);
    }
  }

  update() {
    this.handlePlayerMovements();
  }

  // PUBLIC METHODS FOR COMP1.TSX INTEGRATION
  public handleNewDataProducer(msg: any) {
    const { userId, avatarName } = msg.payload;
    const url = `/assets/${avatarName}/${avatarName}_run.png`;
    // console.log("at handleNewDataProducer ", userId, avatarName, url);

    if (this.gameObjects.get(userId)) {
      console.log("already exists of the user", msg);
      return;
    }
    // Load sprite and wait for completion
    this.load.spritesheet(userId, url, {
      frameWidth: 16,
      frameHeight: 32,
      startFrame: 0,
      endFrame: 23,
    });

    // Listen for the specific file to complete loading
    this.load.once(`filecomplete-spritesheet-${userId}`, () => {
      console.log(`Spritesheet loaded for ${userId}`);

      // Now create the sprite after the spritesheet is loaded
      const pos = {
        posX: this.cameras.main.width / 2,
        posY: this.cameras.main.height / 2,
      };
      this.playerPositions.set(userId, pos);

      const sprite = this.add
        .sprite(pos.posX, pos.posY, userId, 0)
        .setDepth(2)
        .setScale(1.75);

      this.createAnimations(userId);
      this.gameObjects.set(userId, sprite);
    });

    // Start the loading process
    this.load.start();
  }

  public addDataConsumer(dataConsumer: types.DataConsumer) {
    console.log("🎮 Scene: Adding new DataConsumer:", dataConsumer.id,dataConsumer.dataProducerId);

    dataConsumer.on("message", (data: any) => {
      try {
        const msg = JSON.parse(data);
        if (msg.type === "playerMovementUpdate") {
          console.log("got playermoment update ", msg);
          this.handleRemotePlayerUpdates(msg);
        } else {
          console.log(`🔗 New DC received unknown message type:`, msg.type);
        }
      } catch (error) {
        console.error(`🚨 New DC message parse error:`, error);
        console.log(`🚨 Raw data:`, data);
      }
    });

    dataConsumer.on("error", (e) => console.error("🚨 New DC error:", e));
    dataConsumer.on("close", () => console.log("❌ New DataConsumer closed"));
    dataConsumer.on("open", () => console.log("✅ New DataConsumer opened"));

    this.dataConsumers.push(dataConsumer);
  }

  public toggleProximityCircle(radius: number = 150) {
    this.showProximityCircle = !this.showProximityCircle;

    if (this.showProximityCircle) {
      this.showProximityRadius(radius);
    } else {
      this.hideProximityRadius();
    }
  }

  // ✅ PRIVATE HELPER METHODS
  private placeAsset(asset: IAsset) {
    try {
      const x = asset.posX ?? this.cameras.main.width / 2;
      const y = asset.posY ?? this.cameras.main.height / 2;
      let go: Phaser.GameObjects.GameObject;

      if (asset.name === "tile") {
        go = this.add
          .tileSprite(
            0,
            0,
            this.cameras.main.width,
            this.cameras.main.height,
            asset.assetId,
          )
          .setOrigin(0, 0)
          .setDepth(asset.zindex ?? 1);
      } else {
        go = this.add
          .image(x, y, asset.assetId)
          .setScale(asset.scale ?? 1)
          .setDepth(asset.zindex ?? 1);
      }
      this.gameObjects.set(asset.assetId, go);
    } catch (error) {
      console.error("❌ Error placing asset:", asset.assetId, error);
    }
  }

  private setupControls() {
    try {
      this.cursors = this.input.keyboard?.createCursorKeys();

      if (this.currentPlayer) {
        this.physics.add.existing(this.currentPlayer);
        (this.currentPlayer.body as Phaser.Physics.Arcade.Body).setCollideWorldBounds(true);
        console.log("⌨️ Controls setup successfully");
      }
    } catch (error) {
      console.error("❌ Error setting up controls:", error);
    }
  }

  private createAnimations(userId: string) {
    // down-run (18–23), up-run (6–11), right-run (0–5), left-run (12–17)
    this.anims.create({
      key: `${userId}-down-run`,
      frames: this.anims.generateFrameNumbers(userId, { start: 18, end: 23 }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: `${userId}-up-run`,
      frames: this.anims.generateFrameNumbers(userId, { start: 6, end: 11 }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: `${userId}-right-run`,
      frames: this.anims.generateFrameNumbers(userId, { start: 0, end: 5 }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: `${userId}-left-run`,
      frames: this.anims.generateFrameNumbers(userId, { start: 12, end: 17 }),
      frameRate: 10,
      repeat: -1,
    });

    this.anims.create({
      key: `${userId}-up-idle`,
      frames: [{ key: userId, frame: 8 }],
      frameRate: 1,
    });
    this.anims.create({
      key: `${userId}-down-idle`,
      frames: [{ key: userId, frame: 20 }],
      frameRate: 1,
    });
    this.anims.create({
      key: `${userId}-right-idle`,
      frames: [{ key: userId, frame: 2 }],
      frameRate: 1,
    });
    this.anims.create({
      key: `${userId}-left-idle`,
      frames: [{ key: userId, frame: 14 }],
      frameRate: 1,
    });
  }

  private showProximityRadius(radius: number) {
    if (!this.currentPlayer) return;

    // Remove existing circle
    if (this.proximityCircle) {
      this.proximityCircle.destroy();
    }

    // Create new proximity circle
    this.proximityCircle = this.add.graphics();
    this.proximityCircle.lineStyle(2, 0x00ff00, 0.5);
    this.proximityCircle.strokeCircle(0, 0, radius);
    this.proximityCircle.setDepth(10);

    // Position it at current player
    this.proximityCircle.setPosition(
      this.currentPlayer.x,
      this.currentPlayer.y,
    );
  }

  private hideProximityRadius() {
    if (this.proximityCircle) {
      this.proximityCircle.destroy();
      this.proximityCircle = null;
    }
  }

  private handlePlayerMovements() {
    if (!this.currentPlayer || !this.cursors) return;

    const body = this.currentPlayer.body as Phaser.Physics.Arcade.Body;
    let vx = 0,
      vy = 0,
      moving = false,
      dir = this.currentDirection;

    if (this.cursors.down.isDown) {
      vy = this.playerSpeed;
      dir = "down";
      moving = true;
    }
    if (this.cursors.up.isDown) {
      vy = -this.playerSpeed;
      dir = "up";
      moving = true;
    }
    if (this.cursors.right.isDown) {
      vx = this.playerSpeed;
      dir = "right";
      moving = true;
    }
    if (this.cursors.left.isDown) {
      vx = -this.playerSpeed;
      dir = "left";
      moving = true;
    }

    if (this.proximityCircle && this.currentPlayer) {
      this.proximityCircle.setPosition(
        this.currentPlayer.x,
        this.currentPlayer.y,
      );
    }

    this.currentDirection = dir;
    body.setVelocity(vx, vy);

    const animKey = moving
      ? `${this.userId}-${dir}-run`
      : `${this.userId}-${dir}-idle`;

    // Always update current position
    const newPos = { posX: this.currentPlayer.x, posY: this.currentPlayer.y };

    // Send update if moving OR if movement state changed OR position changed significantly
    const positionChanged =
      Math.abs(newPos.posX - this.playerPos.posX) > 2 ||
      Math.abs(newPos.posY - this.playerPos.posY) > 2;

    // Store previous moving state
    const wasMoving = body.velocity.x !== 0 || body.velocity.y !== 0;
    const movementStateChanged = wasMoving !== moving;

    if (moving || positionChanged || movementStateChanged) {
      this.playerPos = newPos;
      this.sendUpdates(moving);
    }

    this.currentPlayer.play(animKey, true);
  }

  private sendUpdates(isMoving: boolean) {
    const msg = JSON.stringify({
      type: "playerMovementUpdate",
      payload: {
        isMoving: isMoving,
        playerUserId: this.userId,
        pos: this.playerPos,
        direction: this.currentDirection,
        timestamp: Date.now(),
      },
    });

    // WebSocket fallback
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(msg);
    }

    // DataProducer
    if (this.dataProducer && !this.dataProducer.closed) {
      const dataChannel = (this.dataProducer as any)._dataChannel;
      if (dataChannel && dataChannel.readyState === "open") {
        try {
          this.dataProducer.send(msg);
          console.log("sent the update using dataproducer", this.dataProducer);
        } catch (error) {
          console.error("🚨 DataProducer.send failed:", error);
        }
      } else {
        console.log("data producer", this.dataProducer);
        console.log(
          "⏳ DataProducer channel not open. State:",
          dataChannel?.readyState,
        );
      }
    } else {
      console.log("hello", this.dataProducer);
      console.log("DataProducer not available or closed");
    }
  }

  private setupDataProducer() {
    if (!this.dataProducer) return;

    this.dataProducer.on("error", (e) => console.error("🚨 DP error:", e));
    this.dataProducer.on("close", () => {
      console.log("❌ DataProducer closed");
      this.dataProducer = null;
    });
    this.dataProducer.on("open", () => {
      console.log("✅ DataProducer opened!");
    });

    const dataChannel = (this.dataProducer as any)._dataChannel;
    if (dataChannel) {
      dataChannel.addEventListener("open", () => {
        console.log("🔗 DataProducer DataChannel opened!");
      });
    } else {
      console.log("Data producer not opened");
    }
  }

  private setupInitialDataConsumers() {
    if (this.dataConsumers.length > 0) {
      console.log("consumers", this.dataConsumers);
      this.dataConsumers.forEach((dataConsumer, index) => {
        if (!dataConsumer.closed) {
          dataConsumer.on("message", (data: any) => {
            try {
              const msg = JSON.parse(data);
              console.log(msg);
              if (msg.type === "playerMovementUpdate") {
                console.log("player moment update", msg);
                this.handleRemotePlayerUpdates(msg);
              } else {
                console.log(
                  `🔗 DC${index} received unknown message type:`,
                  msg.type,
                );
              }
            } catch (error) {
              console.error(`🚨 DC${index} message parse error:`, error);
              console.log(`🚨 Raw data:`, data);
            }
          });

          dataConsumer.on("error", (e) =>
            console.error(`🚨 DC${index} error:`, e),
          );
          dataConsumer.on("close", () =>
            console.log(`❌ DataConsumer ${index} closed`),
          );
          dataConsumer.on("open", () =>
            console.log(`✅ DataConsumer ${index} opened`),
          );
        }
      });
    } else {
      console.log("👤 No initial DataConsumers - likely first player");
    }
  }

  private handleRemotePlayerUpdates(msg: any) {
    const { playerUserId, pos, direction, isMoving } = msg.payload;
    console.log(msg);
    // console.log("current player",this.currentPlayer);
    if (playerUserId === this.userId) {
      return;
    }

    const other = this.gameObjects.get(
      playerUserId,
    ) as Phaser.GameObjects.Sprite;
    // console.log("moved player",other);
    if (!other) {
      console.log(
        `🎮 No sprite found for client ${playerUserId}. Available sprites:`,
        Array.from(this.gameObjects.keys()),
      );
      console.log("userid", this.userId);
      return;
    }
    if (isMoving) {
      other.setPosition(pos.posX, pos.posY);
    }
    const key = isMoving
      ? `${playerUserId}-${direction}-run`
      : `${playerUserId}-${direction}-idle`;
    if (this.anims.exists(key)) {
      other.play(key, true);
    } else {
      console.log(`🎮 Animation not found: ${key}. Available anims:`);
    }

    this.playerPositions.set(playerUserId, pos);
  }
}
