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
	private sendTransport: types.Transport | null = null;
	private recvTransport: types.Transport | null = null;

	// ✅ GAME STATE
	private currentPlayer: Phaser.GameObjects.Sprite | null = null;
	private cursors: Phaser.Types.Input.Keyboard.CursorKeys | undefined;
	private currentDirection = "down";
	private playerPos: PlayerPos = { posX: 0, posY: 0 };
	private playerPositions = new Map<string, PlayerPos>();

	// ✅ ASSETS & RENDERING
	private roomAssets: IAsset[] = [];
	private playerAsset = new Map<string, string>();
	private gameObjects = new Map<string, Phaser.GameObjects.GameObject>();

	// ✅ CONSTANTS
	private readonly playerSpeed = 200;

	constructor() {
		super({ key: "RoomScene" });
	}

	init(data: {
		clientId: string;
		RoomId: string;
		ws: WebSocket;
		sendTransport: types.Transport;
		recvTransport: types.Transport;
		dataConsumers: types.DataConsumer[];
		dataProducer: types.DataProducer;
	}) {
		this.clientId = data.clientId;
		this.roomId = data.RoomId;
		this.ws = data.ws;
		this.dataProducer = data.dataProducer;
		this.dataConsumers = data.dataConsumers;
		this.sendTransport = data.sendTransport;
		this.recvTransport = data.recvTransport;

		console.log("🎮 Room init:", {
			clientId: this.clientId,
			roomId: this.roomId,
			dataProducer: this.dataProducer,
			dataConsumersCount: this.dataConsumers.length,
		});

		this.setupInitialDataConsumers();
	}

	preload() {
		// load room data
		this.load.json(
			"roomData",
			`http://localhost:${import.meta.env.VITE_BKPORT}/api/rooms/${this.roomId}`
		);
		this.load.once("filecomplete-json-roomData", (_key, _type, data: any) => {
			data.assets.forEach((asset: IAsset) => {
				this.roomAssets.push(asset);
				this.load.image(asset.assetId, asset.previewUrl);
			});
		});

		// load player positions
		this.load.json(
			"playersData",
			`http://localhost:${import.meta.env.VITE_BKPORT}/api/rooms/${
				this.roomId
			}/players`
		);
		this.load.once("filecomplete-json-playersData", (_k, _t, data: any) => {
			this.playerPositions = new Map(Object.entries(data));
			console.log("loaded playerPositions:", this.playerPositions);
		});

		// load user avatars and register spritesheets
		this.load.json(
			"userAvatarsData",
			`http://localhost:${import.meta.env.VITE_BKPORT}/api/rooms/${
				this.roomId
			}/userAvatars`
		);
		this.load.once("filecomplete-json-userAvatarsData", (_k, _t, data: any) => {
			this.playerAsset = new Map(Object.entries(data));
			this.playerAsset.forEach((_, clientId) => {
				const url = `/assets/${data[clientId]}/${data[clientId]}_run.png`;
				this.load.spritesheet(clientId, url, {
					frameWidth: 16,
					frameHeight: 32,
					startFrame: 0,
					endFrame: 23,
				});
			});
		});
	}

	create() {
		// ✅ EMIT: Scene creation event for comp1.tsx to catch
		this.events.emit("create");
		this.game.events.emit("create-RoomScene");

		// place room assets
		this.roomAssets.forEach((a) => this.placeAsset(a));

		// place each player sprite
		this.playerAsset.forEach((_, clientId) => {
			const pos = this.playerPositions.get(clientId) ?? { posX: 0, posY: 0 };
			this.playerPos =
				pos.posX === 0 && pos.posY === 0
					? {
							posX: this.cameras.main.width / 2,
							posY: this.cameras.main.height / 2,
					  }
					: pos;

			const sprite = this.add
				.sprite(this.playerPos.posX, this.playerPos.posY, clientId, 0)
				.setDepth(2)
				.setScale(1.75);

			this.createAnimations(clientId);
			this.gameObjects.set(clientId, sprite);

			// Set current player reference
			if (clientId === this.clientId) {
				this.currentPlayer = sprite;
			}
		});

		this.setupControls();
		this.setupDataProducer();
		this.setupInitialDataConsumers();
	}

	update() {
		this.handlePlayerMovements();
	}

	// ✅ PUBLIC METHODS FOR COMP1.TSX INTEGRATION
	public handleNewDataProducer(msg: any) {
		const { producerId } = msg.payload;
		console.log("🎮 Scene: Handling new DataProducer:", producerId);
	}

	public addDataConsumer(dataConsumer: types.DataConsumer) {
		console.log("🎮 Scene: Adding new DataConsumer:", dataConsumer.id);

		dataConsumer.on("message", (data: any) => {
			try {
				// ✅ ADD: Debug logging for new DataConsumers too
				console.log(`🔗 New DC received message:`, data.toString());

				const msg = JSON.parse(data);
				console.log(`🔗 New DC parsed message:`, msg);

				if (msg.type === "playerMovementUpdate") {
					console.log(`🔗 Handling player movement from new DC:`, msg.payload);
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
		console.log(`🔗 Total DataConsumers: ${this.dataConsumers.length}`);
	}

	// ✅ PRIVATE HELPER METHODS
	private placeAsset(asset: IAsset) {
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
					asset.assetId
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
	}

	private setupControls() {
		this.cursors = this.input.keyboard?.createCursorKeys();

		if (this.currentPlayer) {
			this.physics.add.existing(this.currentPlayer);
			(
				this.currentPlayer.body as Phaser.Physics.Arcade.Body
			).setCollideWorldBounds(true);
		}
	}

	private createAnimations(clientId: string) {
		// down-run (18–23), up-run (6–11), right-run (0–5), left-run (12–17)
		this.anims.create({
			key: `${clientId}-down-run`,
			frames: this.anims.generateFrameNumbers(clientId, { start: 18, end: 23 }),
			frameRate: 10,
			repeat: -1,
		});
		this.anims.create({
			key: `${clientId}-up-run`,
			frames: this.anims.generateFrameNumbers(clientId, { start: 6, end: 11 }),
			frameRate: 10,
			repeat: -1,
		});
		this.anims.create({
			key: `${clientId}-right-run`,
			frames: this.anims.generateFrameNumbers(clientId, { start: 0, end: 5 }),
			frameRate: 10,
			repeat: -1,
		});
		this.anims.create({
			key: `${clientId}-left-run`,
			frames: this.anims.generateFrameNumbers(clientId, { start: 12, end: 17 }),
			frameRate: 10,
			repeat: -1,
		});

		this.anims.create({
			key: `${clientId}-up-idle`,
			frames: [{ key: clientId, frame: 8 }],
			frameRate: 1,
		});
		this.anims.create({
			key: `${clientId}-down-idle`,
			frames: [{ key: clientId, frame: 20 }],
			frameRate: 1,
		});
		this.anims.create({
			key: `${clientId}-right-idle`,
			frames: [{ key: clientId, frame: 2 }],
			frameRate: 1,
		});
		this.anims.create({
			key: `${clientId}-left-idle`,
			frames: [{ key: clientId, frame: 14 }],
			frameRate: 1,
		});
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

		this.currentDirection = dir;
		body.setVelocity(vx, vy);

		const animKey = moving
			? `${this.clientId}-${dir}-run`
			: `${this.clientId}-${dir}-idle`;

		const newPos = { posX: this.currentPlayer.x, posY: this.currentPlayer.y };
		const changed =
			Math.abs(newPos.posX - this.playerPos.posX) > 5 ||
			Math.abs(newPos.posY - this.playerPos.posY) > 5;

		if (moving || changed) {
			this.playerPos = newPos;
			this.sendUpdates();
		}

		this.currentPlayer.play(animKey, true);
	}

	private sendUpdates() {
		const msg = JSON.stringify({
			type: "playerMovementUpdate",
			payload: {
				roomId: this.roomId,
				clientId: this.clientId,
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
					console.log("📤 Sent via DataProducer");
				} catch (error) {
					console.error("🚨 DataProducer.send failed:", error);
				}
			} else {
				console.log(
					"⏳ DataProducer channel not open. State:",
					dataChannel?.readyState
				);
			}
		} else {
			console.log("❌ DataProducer not available or closed");
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
		}
	}

	private setupInitialDataConsumers() {
		if (this.dataConsumers.length > 0) {
			this.dataConsumers.forEach((dataConsumer, index) => {
				if (!dataConsumer.closed) {
					dataConsumer.on("message", (data: any) => {
						try {
							// ✅ ADD: Debug logging to see what's being received
							console.log(`🔗 DC${index} received message:`, data.toString());

							const msg = JSON.parse(data);
							console.log(`🔗 DC${index} parsed message:`, msg);

							if (msg.type === "playerMovementUpdate") {
								console.log(
									`🔗 Handling player movement from DC${index}:`,
									msg.payload
								);
								this.handleRemotePlayerUpdates(msg);
							} else {
								console.log(
									`🔗 DC${index} received unknown message type:`,
									msg.type
								);
							}
						} catch (error) {
							console.error(`🚨 DC${index} message parse error:`, error);
							console.log(`🚨 Raw data:`, data);
						}
					});

					dataConsumer.on("error", (e) =>
						console.error(`🚨 DC${index} error:`, e)
					);
					dataConsumer.on("close", () =>
						console.log(`❌ DataConsumer ${index} closed`)
					);
					dataConsumer.on("open", () =>
						console.log(`✅ DataConsumer ${index} opened`)
					);
				}
			});

			console.log(
				`🔗 Set up ${this.dataConsumers.length} initial DataConsumers`
			);
		} else {
			console.log("👤 No initial DataConsumers - likely first player");
		}
	}

	private handleRemotePlayerUpdates(msg: any) {
		console.log("🎮 handleRemotePlayerUpdates called with:", msg);

		const { clientId, pos, direction } = msg.payload;

		// ✅ ADD: Debug logging
		console.log(`🎮 Processing movement for client ${clientId}:`, {
			pos,
			direction,
		});
		console.log(`🎮 My clientId: ${this.clientId}`);

		if (clientId === this.clientId) {
			console.log("🎮 Ignoring own movement update");
			return;
		}

		const other = this.gameObjects.get(clientId) as Phaser.GameObjects.Sprite;
		if (!other) {
			console.log(
				`🎮 No sprite found for client ${clientId}. Available sprites:`,
				Array.from(this.gameObjects.keys())
			);
			return;
		}

		console.log(`🎮 Updating sprite for ${clientId} to position:`, pos);
		other.setPosition(pos.posX, pos.posY);

		const key = `${clientId}-${direction}-run`;
		if (this.anims.exists(key)) {
			other.play(key, true);
			console.log(`🎮 Playing animation: ${key}`);
		} else {
			console.log(
				`🎮 Animation not found: ${key}. Available anims:`,
				Object.keys(this.anims.anims.entries)
			);
		}

		this.playerPositions.set(clientId, pos);
		console.log(`🎮 Updated player position for ${clientId}:`, pos);
	}
}
