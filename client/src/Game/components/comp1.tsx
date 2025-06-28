import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import axios from "axios";
import { types, Device, detectDeviceAsync } from "mediasoup-client";
import { ChatInterface } from "../../components/ChatInterface";
import VideoInterface from "../../components/VideoInterface";
import { BsChat } from "react-icons/bs";
import { IoVideocamOutline } from "react-icons/io5";

const GameComponent: React.FC = () => {
	const containerRef = useRef<HTMLDivElement>(null);
	const gameRef = useRef<any>(null);
	const wsRef = useRef<WebSocket | null>(null);
	const isInit = useRef(false);
	const deviceRef = useRef<types.Device | null>(null);
	const { spaceId, roomId } = useParams<{ spaceId: string; roomId: string }>();
	const { userId } = useAuth();
	const clientIdRef = useRef<string | null>(null);
	const userid = userId ?? "";

	const [showChat, setShowChat] = useState(false);

	// WebRTC initializers
	const sendTransportRef = useRef<types.Transport | null>(null);
	const recvTransportRef = useRef<types.Transport | null>(null);
	const producedataCallbackRef = useRef<any | null>(null);
	const dataProducerRef = useRef<types.DataProducer | null>(null);

	// Game related refs
	const roomSceneRef = useRef<any>(null);
	const dataConsumersRef = useRef<types.DataConsumer[]>([]);
	const phaserStartedRef = useRef(false);

	async function joinSpace() {
		if (!spaceId || !userid) return;
		try {
			await axios.post(`${import.meta.env.VITE_BKPORT}/api/spaces/${spaceId}/join`, {
				clerkId: userid,
			});
		} catch (e) {
			console.error("Failed to join space", e);
		}
	}

	useEffect(() => {
		if (!spaceId || !roomId || !userid || isInit.current) return;
		isInit.current = true;

		(async () => {
			await joinSpace();

			const handlerName = await detectDeviceAsync();
			deviceRef.current = new Device({ handlerName });

			// Fix WebSocket URL construction
			const backendUrl = import.meta.env.VITE_BKPORT || 'http://localhost:5001';
			const protocol = backendUrl.startsWith('https') ? 'wss' : 'ws';
			const wsBaseUrl = backendUrl.replace(/^https?:\/\//, '');
			const wsUrl = `${protocol}://${wsBaseUrl}/ws?userId=${encodeURIComponent(userid)}`;
			
			const ws = new WebSocket(wsUrl);
			wsRef.current = ws;
			console.log('🔗 Connecting to WebSocket:', wsUrl);

			ws.onopen = () => {
				console.log('✅ WebSocket connected successfully');
				ws.send(JSON.stringify({ type: "joinRoom", payload: { roomId } }));
				ws.send(JSON.stringify({ type: "getRtpCapabilites" }));
			};

			ws.onerror = (err) => {
				console.error("🚨 WebSocket connection error:", err);
				console.error("🚨 WebSocket URL was:", wsUrl);
				console.error("🚨 Backend URL:", backendUrl);
			};

			ws.onclose = (event) => {
				console.error(`🔌 WebSocket closed. Code: ${event.code}, Reason: ${event.reason}`);
				if (event.code !== 1000) {
					console.error("🚨 WebSocket closed unexpectedly");
				}
			};

			ws.onmessage = async (e) => {
				const msg = JSON.parse(e.data);

				if (msg.type === "JoinedRoom") {
					clientIdRef.current = msg.payload.clientId;
				}

				if (msg.type === "GotRouterRtpCapabilities") {
					await deviceRef.current!.load({ routerRtpCapabilities: msg.payload });
					ws.send(JSON.stringify({ type: "createWebRtcTransportSend" }));
					ws.send(JSON.stringify({ type: "createWebRtcTransportRecv" }));
				}

				if (msg.type === "SendWebRtcTransportCreated") {
					const {
						id,
						iceParameters,
						iceCandidates,
						dtlsParameters,
						sctpParameters,
					} = msg.payload;

					sendTransportRef.current = deviceRef.current!.createSendTransport({
						id,
						iceParameters,
						iceCandidates,
						dtlsParameters,
						sctpParameters,
					});

					// ✅ ENABLE: Client-side ICE monitoring
					monitorICEConnection(sendTransportRef.current, "Send");

					sendTransportRef.current.on(
						"connect",
						({ dtlsParameters }, callback) => {
							ws.send(
								JSON.stringify({
									type: "connectWebRtcTransport",
									payload: { transportId: id, dtlsParameters },
								})
							);
							callback();
						}
					);

					sendTransportRef.current.on(
						"producedata",
						({ sctpStreamParameters, label, protocol }, callback) => {
							producedataCallbackRef.current = callback;
							ws.send(
								JSON.stringify({
									type: "produceData",
									payload: {
										transportId: id,
										sctpStreamParameters,
										label,
										protocol,
									},
								})
							);
						}
					);

					// Auto-create DataProducer
					if (!dataProducerRef.current) {
						console.log("Creating first data producer");
						const streamId = Math.floor(Math.random() * 65535);

						dataProducerRef.current =
							await sendTransportRef.current.produceData({
								ordered: true,
								label: "player-sync",
								protocol: "json",
								maxPacketLifeTime: undefined,
								maxRetransmits: undefined,
								appData: { streamId }
							});

						// Monitor DataChannel ready state
						const checkDataChannelState = () => {
							if (dataProducerRef.current?.readyState === "open") {
								console.log("✅ DataChannel is ready!");
								return;
							}
							if (dataProducerRef.current?.readyState === "connecting") {
								setTimeout(checkDataChannelState, 2000);
							} else if (dataProducerRef.current?.readyState === "closed") {
								console.error("❌ DataChannel closed unexpectedly");
							}
						};

						// Start monitoring
						checkDataChannelState();
					}
				}

				if (msg.type === "dataProduced" && producedataCallbackRef.current) {
					producedataCallbackRef.current({ id: msg.payload.dataProducerId });
					producedataCallbackRef.current = null;
					console.log("DataProducer ready!");
				}

				if (msg.type === "RecvWebRtcTransportCreated") {
					const {
						id,
						iceParameters,
						iceCandidates,
						dtlsParameters,
						sctpParameters,
					} = msg.payload;

					recvTransportRef.current = deviceRef.current!.createRecvTransport({
						id,
						iceParameters,
						iceCandidates,
						dtlsParameters,
						sctpParameters,
					});

					// ✅ ENABLE: Client-side ICE monitoring
					monitorICEConnection(recvTransportRef.current, "Recv");

					recvTransportRef.current.on(
						"connect",
						({ dtlsParameters }, callback) => {
							ws.send(
								JSON.stringify({
									type: "connectWebRtcTransport",
									payload: { transportId: id, dtlsParameters },
								})
							);
							callback();
						}
					);
				}

				// ✅ NEW: Handle server ICE/DTLS state updates
				if (msg.type === "transportIceStateChange") {
					// console.log(
					// 	`🧊 Server ICE state: ${msg.payload.iceState} for transport ${msg.payload.transportId}`
					// );
				}

				if (msg.type === "transportDtlsStateChange") {
					// console.log(
					// 	`🔒 Server DTLS state: ${msg.payload.dtlsState} for transport ${msg.payload.transportId}`
					// );
				}

				// ✅ HANDLE: New DataProducers from other players
				if (msg.type === "newDataProducer") {
					const { producerId } = msg.payload;
					if (recvTransportRef.current) {
						ws.send(
							JSON.stringify({
								type: "consumeData",
								payload: {
									producerId: producerId,
									transportId: recvTransportRef.current.id,
								},
							})
						);
					}

					// ✅ FORWARD TO SCENE: If scene exists, notify it
					if (
						roomSceneRef.current &&
						typeof roomSceneRef.current.handleNewDataProducer === "function"
					) {
						roomSceneRef.current.handleNewDataProducer(msg);
					}
				}

				// ✅ HANDLE: DataConsumer creation
				if (msg.type === "dataConsumerCreated") {
					const { id, producerId, sctpStreamParameters, label, protocol } =
						msg.payload;
					const dataConsumer = await recvTransportRef.current!.consumeData({
						id,
						dataProducerId: producerId,
						sctpStreamParameters,
						label,
						protocol,
					});

					dataConsumersRef.current.push(dataConsumer);

					// ✅ FORWARD TO SCENE: Notify scene of new DataConsumer
					if (
						roomSceneRef.current &&
						typeof roomSceneRef.current.addDataConsumer === "function"
					) {
						roomSceneRef.current.addDataConsumer(dataConsumer);
					}
				}

				// ✅ START PHASER: After WebRTC setup is complete
				if (msg.type === "webRtcTransportConnected") {
					setTimeout(async () => {
						if (!phaserStartedRef.current && dataProducerRef.current) {
							console.log("🚀 Starting Phaser game");
							phaserStartedRef.current = true;
							await createPhaserGame();
						}
					}, 1000);
				}

				// ✅ NEW: Handle ICE restart response
				if (msg.type === "iceRestarted") {
					const { transportId, iceParameters } = msg.payload;
					// Find the transport and restart ICE with new parameters
					const transport =
						transportId === sendTransportRef.current?.id
							? sendTransportRef.current
							: recvTransportRef.current;

					if (transport) {
						try {
							await transport.restartIce({ iceParameters });
							// console.log(
							// 	`🔄 ICE restarted successfully for transport ${transportId}`
							// );
						} catch (error) {
							console.error(`❌ ICE restart failed:`, error);
						}
					}
				}

				console.log(msg);
			};

			async function createPhaserGame() {
				try {
					console.log("🎮 Starting Phaser game initialization...");
					
					// ✅ FIXED: Import Phaser and room scene properly
					const [PhaserModule, roomModule] = await Promise.all([
						import("phaser"),
						import("../scenes/room"),
					]);
					
					const Phaser = PhaserModule.default || PhaserModule;
					const { room: RoomScene } = roomModule;

					console.log("📦 Phaser and Room modules loaded successfully");

					// ✅ FIXED: Destroy existing game if any
					if (gameRef.current) {
						console.log("🗑️ Destroying existing Phaser game");
						gameRef.current.destroy(true);
						gameRef.current = null;
					}

					// ✅ FIXED: Ensure container is available
					if (!containerRef.current) {
						console.error("❌ Game container not found");
						return;
					}

					// ✅ FIXED: Create Phaser game with proper config
					const gameConfig = {
						type: Phaser.AUTO,
						parent: containerRef.current,
						width: window.innerWidth,
						height: window.innerHeight,
						backgroundColor: "#000000",
						physics: { 
							default: "arcade", 
							arcade: { 
								gravity: { x: 0, y: 0 },
								debug: false
							} 
						},
						dom: {
							createContainer: true
						},
						scale: {
							mode: Phaser.Scale.RESIZE,
							autoCenter: Phaser.Scale.CENTER_BOTH
						}
					};

					console.log("🎮 Creating Phaser Game with config:", gameConfig);
					gameRef.current = new Phaser.Game(gameConfig);

					// ✅ FIXED: Wait for game to be ready
					gameRef.current.events.once('ready', () => {
						console.log("🎮 Phaser Game is ready");
						
						// Add the room scene
						gameRef.current.scene.add("RoomScene", RoomScene, false);

						// Listen for scene creation
						gameRef.current.events.once("create-RoomScene", () => {
							roomSceneRef.current = gameRef.current.scene.getScene("RoomScene");
							console.log("🏁 RoomScene reference acquired:", roomSceneRef.current);
						});

						// Prepare launch data
						const launchData = {
							clientId: clientIdRef.current,
							RoomId: roomId,
							userId: userid,
							ws: wsRef.current,
							sendTransport: sendTransportRef.current,
							recvTransport: recvTransportRef.current,
							dataConsumers: dataConsumersRef.current,
							dataProducer: dataProducerRef.current,
						};

						console.log("🚀 Starting RoomScene with data:", launchData);
						
						// Start the scene
						try {
							gameRef.current.scene.start("RoomScene", launchData);
							console.log("✅ RoomScene started successfully");
						} catch (sceneError) {
							console.error("❌ Error starting RoomScene:", sceneError);
						}
					});

				} catch (error) {
					console.error("❌ Error creating Phaser game:", error);
					console.error("Stack trace:", error);
				}
			}

			// Cleanup function
			return () => {
				console.log("🧹 Cleaning up GameComponent");
				
				if (wsRef.current) {
					wsRef.current.send(
						JSON.stringify({ type: "leaveRoom", payload: { roomId } })
					);
					wsRef.current.close();
					wsRef.current = null;
				}
				
				if (gameRef.current) {
					console.log("🗑️ Destroying Phaser game");
					gameRef.current.destroy(true);
					gameRef.current = null;
				}
				
				// Reset refs
				roomSceneRef.current = null;
				dataConsumersRef.current = [];
				phaserStartedRef.current = false;
			};
		})();

		return () => {
			if (wsRef.current) {
				wsRef.current.send(
					JSON.stringify({ type: "leaveRoom", payload: { roomId } })
				);
				wsRef.current.close();
			}
			if (gameRef.current) {
				gameRef.current.destroy(true);
			}
		};
	}, [spaceId, roomId, userid]);

	function monitorICEConnection(
		transport: types.Transport,
		transportType: string
	) {
		let iceGatheringComplete = false;
		let connectionTimeout: NodeJS.Timeout;

		// Monitor ICE gathering
		transport.on("icegatheringstatechange", () => {
			if (transport.iceGatheringState === "complete") {
				iceGatheringComplete = true;
				// console.log(`✅ ${transportType} ICE gathering completed`);
			}
		});

		// Monitor connection state
		transport.on("connectionstatechange", () => {
			if (transport.connectionState === "connected") {
				// console.log(`✅ ${transportType} WebRTC connected!`);
				if (connectionTimeout) clearTimeout(connectionTimeout);
			} else if (transport.connectionState === "failed") {
				console.error(`❌ ${transportType} WebRTC connection failed!`);
				console.error(`ICE gathering complete: ${iceGatheringComplete}`);
				console.error(`Current ICE state: ${transport.connectionState}`);
				if (connectionTimeout) clearTimeout(connectionTimeout);

				wsRef.current?.send(
					JSON.stringify({
						type: "restartIce",
						payload: {
							transportId: transport.id,
							transportType: transportType,
						},
					})
				);
			}
		});

		// Set a timeout for connection
		connectionTimeout = setTimeout(() => {
			if (transport.connectionState !== "connected") {
				console.error(
					`⏰ ${transportType} connection timeout after 30 seconds`
				);
				console.log(`Current state: ${transport.connectionState}`);
				console.log(`ICE gathering complete: ${iceGatheringComplete}`);
				console.log(`ICE connection state: ${transport.connectionState}`);

				wsRef.current?.send(
					JSON.stringify({
						type: "restartIce",
						payload: {
							transportId: transport.id,
							transportType: transportType,
						},
					})
				);
			}
		}, 30000);
	}

	return (
		<>
			<div 
				ref={containerRef} 
				id="game-container"
				style={{
					width: "100vw",
					height: "100vh",
					position: "relative",
					overflow: "hidden",
					background: "#000000"
				}}
			>
				{/* Game will be rendered here */}
			</div>

			{/* Interface controls */}
			<div className="video-overlay">
				<VideoInterface
					sendTransport={sendTransportRef.current}
					recvTransport={recvTransportRef.current}
					ws={wsRef.current}
					clientId={clientIdRef.current}
				/>
			</div>

			<div className="interface-overlay">
				<button
					className="interface-toggle-btn"
					onClick={() => {
						if ((window as any).toggleVideo) {
							(window as any).toggleVideo();
						}
					}}
					title="Toggle Video"
				>
					<IoVideocamOutline size={20} />
					<span>Video</span>
				</button>
			</div>

			<div className="chat-controls">
				<button
					className="chat-toggle-btn"
					onClick={() => setShowChat(!showChat)}
					title="Toggle Chat"
					style={{
						background: showChat ? "var(--neon-green)" : "var(--bg-elevated)"
					}}
				>
					<BsChat size={20} />
					<span>Chat</span>
				</button>
			</div>

			{/* Chat Interface */}
			{showChat && wsRef.current && (
				<ChatInterface
					ws={wsRef.current}
					userId={userid}
					onClose={() => setShowChat(false)}
				/>
			)}
		</>
	);
};

export default GameComponent;
