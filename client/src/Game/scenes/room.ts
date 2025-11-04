import { Scene } from "phaser";
import { IAsset } from "../../../../shared/types";
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
	sendTransport: types.Transport | null = null;
	recvTransport: types.Transport | null = null;

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

	// ✅ ADD: Prevent multiple retry timeouts
	private dataChannelRetryTimeout: NodeJS.Timeout | null = null;
	private dataChannelRetryCount: number = 0;
	private maxRetries: number = 5;

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
		this.sendTransport = data.sendTransport;
		this.recvTransport = data.recvTransport;

		if (!this.ws) {
			console.warn("⚠️  No WebSocket connection found");
			return;
		}

		console.log("🎮 Room init:", {
			userId: this.userId,
			clientId: this.clientId,
			roomId: this.roomId,
			hasDataProducer: !!this.dataProducer,
			dataConsumersCount: this.dataConsumers.length,
			hasWS: !!this.ws,
		});

		// Set up WebSocket listeners for server events
		this.setupWebSocketListeners();
		this.setupInitialDataConsumers();
	}

	private setupWebSocketListeners() {
		if (!this.ws) return;

		this.ws.addEventListener("message", (event) => {
			try {
				const msg = JSON.parse(event.data);

				// Handle player/producer disconnections
				if (msg.type === "clientLeft" || msg.type === "dataProducerClosed") {
					const userId = msg.payload.userId || msg.payload.clientId;
					console.log(`👋 Player ${userId} left the room`);
					
					// Remove player sprite
					const playerSprite = this.gameObjects.get(userId);
					if (playerSprite) {
						playerSprite.destroy();
						this.gameObjects.delete(userId);
					}
					
					// Remove position data
					this.playerPositions.delete(userId);
				}
				
				// Handle WebSocket fallback for movement updates
				if (msg.type === "playerMovementUpdate") {
					this.handleRemotePlayerUpdates(msg);
				}
			} catch (error) {
				// Ignore parse errors for non-JSON messages
			}
		});

		console.log("✅ WebSocket listeners set up");
	}

	preload() {
		const backendUrl = import.meta.env.VITE_BACKEND_URL;

		// load room data
		this.load.json("roomData", `${backendUrl}/api/rooms/${this.roomId}`);
		this.load.once(
			"filecomplete-json-roomData",
			(_key: string, _type: string, data: any) => {
				data.assets.forEach((asset: IAsset) => {
					this.roomAssets.push(asset);
					this.load.image(asset.assetId, asset.previewUrl);
				});
			}
		);

		// load player positions
		this.load.json(
			"playersData",
			`${backendUrl}/api/rooms/${this.roomId}/players`
		);
		this.load.once(
			"filecomplete-json-playersData",
			(_k: string, _t: string, data: any) => {
				this.playerPositions = new Map(Object.entries(data));
				// console.log("loaded playerPositions:", this.playerPositions);
			}
		);

		// load user avatars and register spritesheets
		this.load.json(
			"userAvatarsData",
			`${backendUrl}/api/rooms/${this.roomId}/userAvatars`
		);
		this.load.once(
			"filecomplete-json-userAvatarsData",
			(_k: string, _t: string, data: any) => {
				this.playerAsset = new Map(Object.entries(data));
				this.playerAsset.forEach((_, userId) => {
					const url = `/assets/${data[userId]}/${data[userId]}_run.png`;
					console.log("check 1", userId, url);
					this.load.spritesheet(userId, url, {
						frameWidth: 16,
						frameHeight: 32,
						startFrame: 0,
						endFrame: 23,
					});
				});
			}
		);
	}

	create() {
		// ✅ EMIT: Scene creation event for comp1.tsx to catch
		this.events.emit("create");
		this.game.events.emit("create-RoomScene");

		// place room assets
		this.roomAssets.forEach((a) => this.placeAsset(a));
		// place each player sprite
		this.playerAsset.forEach((_, userId) => {
			const pos = this.playerPositions.get(userId) ?? { posX: 0, posY: 0 };
			this.playerPos =
				pos.posX === 0 && pos.posY === 0
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
			}
		});
		this.setupControls();
		this.setupDataProducer();
		this.setupInitialDataConsumers();
		this.setupDataChannelMonitoring();
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
		// console.log("🎮 Scene: Adding new DataConsumer:", dataConsumer.id,dataConsumer.dataProducerId);

		dataConsumer.on("message", (data: any) => {
			try {
				const msg = JSON.parse(data);
				console.log("📨 Received via DataChannel:", msg);

				if (msg.type === "playerMovementUpdate") {
					this.handleRemotePlayerUpdates(msg);
				} else if (msg.type === "test") {
					console.log("🧪 DataChannel test message received!");
				} else {
					console.log(`🔗 Unknown message type:`, msg.type);
				}
			} catch (error) {
				console.error(`🚨 Message parse error:`, error);
				console.log(`🚨 Raw data:`, data);
			}
		});

		dataConsumer.on("error", (e) => console.error("🚨 DataConsumer error:", e));
		dataConsumer.on("close", () => console.log("❌ DataConsumer closed"));
		dataConsumer.on("open", () => console.log("✅ DataConsumer opened"));

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
			this.currentPlayer.y
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
				this.currentPlayer.y
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

	// ✅ ADD: Handle DataChannel open event
	public handleDataChannelOpen() {
		console.log("🎮 Room: DataChannel opened!");
		// Reset retry state
		this.dataChannelRetryCount = 0;
		if (this.dataChannelRetryTimeout) {
			clearTimeout(this.dataChannelRetryTimeout);
			this.dataChannelRetryTimeout = null;
		}
	}

	// ✅ IMPROVED: Better sendUpdates method
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

		let sentViaDataChannel = false;
		let sentViaWebSocket = false;

		// ✅ DataProducer - PRIMARY method for position updates
		if (this.dataProducer && !this.dataProducer.closed) {
			const dataChannel = (this.dataProducer as any)._dataChannel;

			if (dataChannel && dataChannel.readyState === "open") {
				try {
					this.dataProducer.send(msg);
					sentViaDataChannel = true;
					this.dataChannelRetryCount = 0;
					
					// Periodic debug logging (every 50th message)
					if (Math.random() < 0.02) {
						console.log("📤 Sent via DataChannel:", { pos: this.playerPos, dir: this.currentDirection });
					}
				} catch (error) {
					console.error("🚨 DataProducer.send failed:", error);
					sentViaDataChannel = false;
				}
			} else if (dataChannel && dataChannel.readyState === "connecting") {
				// Wait for DataChannel to open, but don't spam retries
				if (
					!this.dataChannelRetryTimeout &&
					this.dataChannelRetryCount < this.maxRetries
				) {
					this.dataChannelRetryCount++;
					console.log(
						`⏳ DataChannel connecting (attempt ${this.dataChannelRetryCount}/${this.maxRetries})`
					);

					this.dataChannelRetryTimeout = setTimeout(() => {
						this.dataChannelRetryTimeout = null;
						this.sendUpdates(isMoving);
					}, 3000);
				}
			} else {
				if (Math.random() < 0.01) { // Occasional logging
					console.log("⚠️  DataChannel not ready, state:", dataChannel?.readyState);
				}
			}
		}

		// ✅ WebSocket fallback - ALWAYS send for reliability in development
		if (this.ws?.readyState === WebSocket.OPEN) {
			try {
				this.ws.send(msg);
				sentViaWebSocket = true;
			} catch (error) {
				console.error("🚨 WebSocket.send failed:", error);
			}
		}

		// Log if neither method worked
		if (!sentViaDataChannel && !sentViaWebSocket) {
			console.error("❌ Failed to send position update via both DataChannel and WebSocket");
		}
	}

	private setupDataProducer() {
		if (!this.dataProducer) {
			console.warn("⚠️  No DataProducer to setup");
			return;
		}

		console.log(`🔧 Setting up DataProducer: ${this.dataProducer.id.substr(0, 8)}`);

		this.dataProducer.on("error", (e) => console.error("🚨 DataProducer error:", e));
		this.dataProducer.on("close", () => {
			console.log("❌ DataProducer closed");
			this.dataProducer = null;
		});
		this.dataProducer.on("open", () => {
			console.log("✅ DataProducer opened!");
		});

		const dataChannel = (this.dataProducer as any)._dataChannel;
		if (dataChannel) {
			console.log(`  📡 DataChannel initial state: ${dataChannel.readyState}`);
			
			dataChannel.addEventListener("open", () => {
				console.log("🔗 DataChannel opened!");
				this.dataChannelRetryCount = 0;
				if (this.dataChannelRetryTimeout) {
					clearTimeout(this.dataChannelRetryTimeout);
					this.dataChannelRetryTimeout = null;
				}
			});
			
			dataChannel.addEventListener("close", () => {
				console.log("❌ DataChannel closed!");
			});
			
			dataChannel.addEventListener("error", (event: any) => {
				console.error("🚨 DataChannel error:", event);
			});
			
			dataChannel.addEventListener("bufferedamountlow", () => {
				console.log("📉 DataChannel buffer cleared");
			});
		} else {
			console.warn("⚠️  DataChannel not accessible from DataProducer");
		}
	}

	private setupDataChannelMonitoring() {
		if (!this.dataProducer) {
			console.warn("⚠️  No DataProducer for monitoring");
			return;
		}

		const dataChannel = (this.dataProducer as any)._dataChannel;
		if (dataChannel) {
			dataChannel.addEventListener("open", () => {
				console.log("🔗 DataChannel opened successfully!");
				// Clear any pending retry
				if (this.dataChannelRetryTimeout) {
					clearTimeout(this.dataChannelRetryTimeout);
					this.dataChannelRetryTimeout = null;
				}
				this.dataChannelRetryCount = 0;
			});

			dataChannel.addEventListener("close", () => {
				console.log("❌ DataChannel closed");
			});

			dataChannel.addEventListener("error", (event: any) => {
				console.error("🚨 DataChannel error:", event);
			});

			// Monitor ready state changes - check periodically
			let lastState = dataChannel.readyState;
			const checkState = () => {
				const currentState = dataChannel.readyState;
				if (currentState !== lastState) {
					console.log(`� DataChannel state changed: ${lastState} → ${currentState}`);
					lastState = currentState;
				}
			};

			// Check state every 5 seconds
			const monitorInterval = setInterval(checkState, 5000);

			// Clean up interval when scene is destroyed
			this.events.on('shutdown', () => {
				clearInterval(monitorInterval);
			});
		} else {
			console.warn("⚠️  DataChannel not accessible for monitoring");
		}
	}

	private setupInitialDataConsumers() {
		console.log(`🔧 Setting up ${this.dataConsumers.length} initial DataConsumers`);
		
		if (this.dataConsumers.length > 0) {
			this.dataConsumers.forEach((dataConsumer, index) => {
				if (!dataConsumer.closed) {
					console.log(`  📥 Setting up DataConsumer ${index + 1}/${this.dataConsumers.length}: ${dataConsumer.id.substr(0, 8)}`);
					
					dataConsumer.on("message", (data: any) => {
						try {
							const msg = JSON.parse(data);
							
							if (msg.type === "playerMovementUpdate") {
								this.handleRemotePlayerUpdates(msg);
							} else if (msg.type === "test") {
								console.log("🧪 DataChannel test message received!");
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
					dataConsumer.on("close", () => {
						console.log(`❌ DataConsumer ${index} closed`);
					});
					dataConsumer.on("open", () => {
						console.log(`✅ DataConsumer ${index} opened`);
					});
				} else {
					console.warn(`⚠️  DataConsumer ${index} is already closed`);
				}
			});
		} else {
			console.log("👤 No initial DataConsumers - likely first player in room");
		}
	}

	private handleRemotePlayerUpdates(msg: any) {
		const { playerUserId, pos, direction, isMoving } = msg.payload;

		if (playerUserId === this.userId) {
			return; // Don't update self
		}

		// Periodic debug logging (every ~30th message)
		if (Math.random() < 0.03) {
			console.log(`🔄 Updating player ${playerUserId}:`, {
				pos: `(${pos.posX.toFixed(0)}, ${pos.posY.toFixed(0)})`,
				direction,
				isMoving,
			});
		}

		const otherPlayer = this.gameObjects.get(
			playerUserId
		) as Phaser.GameObjects.Sprite;
		
		if (!otherPlayer) {
			console.warn(`⚠️  Player ${playerUserId} not found in gameObjects`);
			return;
		}

		// Update position with smooth interpolation for better visuals
		const currentX = otherPlayer.x;
		const currentY = otherPlayer.y;
		const distance = Math.hypot(pos.posX - currentX, pos.posY - currentY);

		// If distance is large, teleport; otherwise, move smoothly
		if (distance > 100) {
			// Teleport for large distances (probably reconnect or lag)
			otherPlayer.setPosition(pos.posX, pos.posY);
		} else {
			// Smooth movement for small distances
			this.tweens.add({
				targets: otherPlayer,
				x: pos.posX,
				y: pos.posY,
				duration: 100, // 100ms smooth transition
				ease: 'Linear'
			});
		}

		// Update animation
		const animKey = isMoving
			? `${playerUserId}-${direction}-run`
			: `${playerUserId}-${direction}-idle`;

		if (this.anims.exists(animKey)) {
			otherPlayer.play(animKey, true);
		} else {
			console.warn(`⚠️  Animation ${animKey} not found`);
		}

		// Update stored position
		this.playerPositions.set(playerUserId, pos);
	}
}
