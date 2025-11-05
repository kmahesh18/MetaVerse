import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import axios from "axios";
import { types, Device, detectDeviceAsync } from "mediasoup-client";
import { ChatInterface } from "../../components/ChatInterface";
import VideoInterface from "../../components/VideoInterface";
import { BsChat } from "react-icons/bs";

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

	//webrtc initiliazers
	const sendTransportRef = useRef<types.Transport | null>(null);
	const recvTransportRef = useRef<types.Transport | null>(null);
	const producedataCallbackRef = useRef<any | null>(null);
	const dataProducerRef = useRef<types.DataProducer | null>(null);
	const videoProduceCallbackRef = useRef<any | null>(null);

	//game related ref's
	const roomSceneRef = useRef<any>(null);
	const dataConsumersRef = useRef<types.DataConsumer[]>([]);
	const mediaConsumersRef = useRef<Record<string, Record<string, types.Consumer>>>({});
	const phaserStartedRef = useRef(false);

	const backendUrl = import.meta.env.VITE_BACKEND_URL;

	async function joinSpace() {
		if (!spaceId || !userid) return;
		try {
			await axios.post(`${backendUrl}/api/spaces/${spaceId}/join`, {
				clerkId: userid,
			});
		} catch (e) {
			console.error("Failed to join space", e);
		}
	}

	useEffect(() => {
		if (!spaceId || !roomId || !userid || isInit.current) return;
		isInit.current = true;

		// ✅ Add beforeunload handler for page refresh/close
		const handleBeforeUnload = () => {
			console.log("🔄 Page unloading, cleaning up...");
			if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
				// Send leave room message
				wsRef.current.send(
					JSON.stringify({
						type: "leaveRoom",
						payload: { roomId },
					})
				);
			}
		};

		window.addEventListener("beforeunload", handleBeforeUnload);

		(async () => {
			await joinSpace();

			const handlerName = await detectDeviceAsync();
			deviceRef.current = new Device({ handlerName });

			const protocol = window.location.protocol === "https:" ? "wss" : "ws";
			const wsUrl = `${protocol}://${backendUrl.replace(
				/^https?:\/\//,
				""
			)}/ws?userId=${encodeURIComponent(userid)}`;
			const ws = new WebSocket(wsUrl);
			wsRef.current = ws;

			ws.onopen = () => {
				ws.send(JSON.stringify({ type: "joinRoom", payload: { roomId } }));
				ws.send(JSON.stringify({ type: "getRtpCapabilites" }));
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
					return;
				}

			if (msg.type === "SendWebRtcTransportCreated") {
				const {
					id,
					iceParameters,
					iceCandidates,
					dtlsParameters,
					sctpParameters,
					iceServers, // TURN server config from server
				} = msg.payload;

			sendTransportRef.current = deviceRef.current!.createSendTransport({
				id,
				iceParameters,
				iceCandidates,
				dtlsParameters,
				sctpParameters,
				iceServers, // Pass TURN server config to transport
			});

			// ✅ ENABLE: Client-side ICE monitoring
			monitorICEConnection(sendTransportRef.current, "Send");

			// Add connection state monitoring
			sendTransportRef.current.on("connectionstatechange", (state) => {
				console.log(`📡 Send Transport connection state: ${state}`);
				if (state === "failed" || state === "disconnected") {
					console.error("❌ Send transport failed! TURN server may not be working.");
				}
			});

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
						console.log("firtst");
						const streamId = Math.floor(Math.random() * 65535);

						dataProducerRef.current =
							await sendTransportRef.current.produceData({
								ordered: true,
								label: "player-sync",
								protocol: "json",
								sctpStreamParameters: {
									streamId,
									ordered: true,
									maxPacketLifeTime: undefined,
									maxRetransmits: undefined,
								},
							} as any);

						// ✅ IMPROVED: Better DataChannel monitoring
						const dataChannel = (dataProducerRef.current as any)._dataChannel;
						if (dataChannel) {
							dataChannel.addEventListener("open", () => {
								console.log("✅ DataChannel opened successfully!");
								// Notify room scene
								if (roomSceneRef.current) {
									roomSceneRef.current.handleDataChannelOpen();
								}
							});

							dataChannel.addEventListener("close", () => {
								console.log("❌ DataChannel closed");
							});

							dataChannel.addEventListener("error", () => {
								console.error("🚨 DataChannel error:");
							});

							// Monitor state changes
							const checkState = () => {
								if (dataChannel.readyState === "open") {
									console.log("✅ DataChannel is ready!");
								} else if (dataChannel.readyState === "connecting") {
									console.log("⏳ DataChannel still connecting...");
								} else {
									console.log("❌ DataChannel state:", dataChannel.readyState);
								}
							};

							// Check every 2 seconds
							const stateCheckInterval = setInterval(checkState, 2000);

							// Clean up interval when component unmounts
							return () => clearInterval(stateCheckInterval);
						}

						// ✅ Send initial message to test DataChannel
						setTimeout(() => {
							if (dataProducerRef.current && !dataProducerRef.current.closed) {
								const testMsg = JSON.stringify({
									type: "test",
									payload: { message: "DataChannel test" },
								});
								try {
									dataProducerRef.current.send(testMsg);
									console.log("📤 Test message sent via DataChannel");
								} catch (error) {
									console.error("🚨 Test message failed:", error);
								}
							}
						}, 3000);
					}
				}

			if (msg.type === "dataProduced" && producedataCallbackRef.current) {
				producedataCallbackRef.current({ id: msg.payload.dataProducerId });
				producedataCallbackRef.current = null;
				console.log("DataProducer ready!");
			}

			// ✅ HANDLE: Video/Audio producer created
			if (msg.type === "mediaProducerCreated" || msg.type === "mediaProducerExists") {
				console.log("video/audio producer created", msg);
				if (videoProduceCallbackRef.current) {
					videoProduceCallbackRef.current({ id: msg.payload.producerId });
					videoProduceCallbackRef.current = null;
				}
			}

			// ✅ HANDLE: New media producer from another player (consume their video/audio)
			if (msg.type === "newMediaProducer") {
				console.log("📹 New media producer from", msg.payload.userId);
				const { userId, avatarName, producerId } = msg.payload;
				
				if (recvTransportRef.current && deviceRef.current) {
					wsRef.current?.send(
						JSON.stringify({
							type: "consumeMedia",
							payload: {
								producerId: producerId,
								transportId: recvTransportRef.current.id,
								rtpCapabilities: deviceRef.current.rtpCapabilities,
								userId: userId,
								avatarName: avatarName,
							},
						})
					);
				}
			}

			if (msg.type === "RecvWebRtcTransportCreated") {
				const {
					id,
					iceParameters,
					iceCandidates,
					dtlsParameters,
					sctpParameters,
					iceServers, // TURN server config from server
				} = msg.payload;

			recvTransportRef.current = deviceRef.current!.createRecvTransport({
				id,
				iceParameters,
				iceCandidates,
				dtlsParameters,
				sctpParameters,
				iceServers, // Pass TURN server config to transport
			});

			// ✅ ENABLE: Client-side ICE monitoring
			monitorICEConnection(recvTransportRef.current, "Recv");

			// Add connection state monitoring
			recvTransportRef.current.on("connectionstatechange", (state) => {
				console.log(`📡 Recv Transport connection state: ${state}`);
				if (state === "failed" || state === "disconnected") {
					console.error("❌ Recv transport failed! TURN server may not be working.");
				}
			});

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

		// ✅ HANDLE: New MediaProducers (video/audio) from other players
		if (msg.type === "newMediaProducer") {
			console.log(`🎥 New ${msg.payload.kind} producer from user: ${msg.payload.userId}`);
			const { producerId, userId, avatarName } = msg.payload;
			
			if (recvTransportRef.current && deviceRef.current) {
				// Request to consume this media producer
				ws.send(
					JSON.stringify({
						type: "consumeMedia",
						payload: {
							producerId: producerId,
							transportId: recvTransportRef.current.id,
							rtpCapabilities: deviceRef.current.rtpCapabilities,
							userId: userId,
							avatarName: avatarName,
						},
					})
				);
			}
		}

		// ✅ HANDLE: MediaConsumer creation (when we receive video/audio from others)
		if (msg.type === "mediaConsumerCreated") {
			console.log(`📥 MediaConsumer created for ${msg.payload.kind} from ${msg.payload.userId}`);
			const { id, producerId, userId, avatarName, kind, rtpParameters } = msg.payload;
			
			try {
				const mediaConsumer = await recvTransportRef.current!.consume({
					id,
					producerId,
					kind,
					rtpParameters,
				});

				// Resume the consumer to start receiving media
				await mediaConsumer.resume();

				console.log(`✅ ${kind} consumer active for user ${userId}`);

				// Store the consumer
				if (!mediaConsumersRef.current[userId]) {
					mediaConsumersRef.current[userId] = {};
				}
				mediaConsumersRef.current[userId][kind] = mediaConsumer;

				// Get the media track and display it
				const track = mediaConsumer.track;
				if (track) {
					console.log(`🎬 Got ${kind} track from ${userId}`);
					
					// Forward to scene to display the video/audio
					if (
						roomSceneRef.current &&
						typeof roomSceneRef.current.handleRemoteMedia === "function"
					) {
						roomSceneRef.current.handleRemoteMedia(userId, kind, track, avatarName);
					}
				}
			} catch (error) {
				console.error(`❌ Failed to consume ${kind}:`, error);
			}
		}

		// ✅ HANDLE: DataConsumer creation				// ✅ HANDLE: DataConsumer creation
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
				// ✅ METHOD 2: Use Phaser Events to get scene reference
				const [PhaserModule, roomModule] = await Promise.all([
					import("phaser"),
					import("../scenes/room"),
				]);
				const Phaser = PhaserModule as typeof import("phaser");
				const { room: RoomScene } = roomModule;

				gameRef.current = new Phaser.Game({
					type: Phaser.AUTO,
					parent: containerRef.current!,
					width: window.innerWidth,
					height: window.innerHeight,
					backgroundColor: "#000",
					physics: { default: "arcade", arcade: { gravity: { x: 0, y: 0 } } },
				});

				// ✅ METHOD 2: Register scene without auto-start
				gameRef.current.scene.add("RoomScene", RoomScene, false);

				// ✅ METHOD 2: Listen for scene creation event
				gameRef.current.events.once("create-RoomScene", () => {
					roomSceneRef.current = gameRef.current!.scene.getScene("RoomScene");
					console.log("🏁 RoomScene reference acquired:", roomSceneRef.current);
				});

				// ✅ METHOD 2: Start scene with data
				const launchData = {
					clientId: clientIdRef.current!,
					RoomId: roomId,
					userId: userId,
					ws: wsRef.current!,
					sendTransport: sendTransportRef.current!,
					recvTransport: recvTransportRef.current!,
					dataConsumers: dataConsumersRef.current,
					dataProducer: dataProducerRef.current!,
				};

				gameRef.current.scene.start("RoomScene", launchData);
			}

			ws.onerror = (err) => {
				console.error("WS error:", err);
			};
		})();

		// Cleanup function
		return () => {
			console.log("🧹 Cleaning up GameComponent...");
			
			// Remove beforeunload listener
			window.removeEventListener("beforeunload", handleBeforeUnload);
			
			if (wsRef.current) {
				wsRef.current.send(
					JSON.stringify({ type: "leaveRoom", payload: { roomId } })
				);
				console.log(`🔌 Closing WebSocket (state: ${wsRef.current.readyState})`);
				wsRef.current.close();
			}
			if (gameRef.current) {
				console.log("🎮 Destroying Phaser game instance");
				gameRef.current.destroy(true);
			}
			
			// Clear refs
			isInit.current = false;
			phaserStartedRef.current = false;
		};
	}, [spaceId, roomId, userid]);

	function monitorICEConnection(
		transport: types.Transport,
		transportType: string
	) {
		console.log(
			`🔍 ${transportType} transport initial state:`,
			transport.connectionState
		);

		transport.on("connectionstatechange", (state) => {
			console.log(`🔄 ${transportType} transport state changed to:`, state);

			if (state === "failed" || state === "disconnected") {
				console.error(`❌ ${transportType} transport failed/disconnected`);
			} else if (state === "connected") {
				console.log(`✅ ${transportType} transport connected!`);
			}
		});
	}

	// Add state monitoring
	const [dataChannelState, setDataChannelState] = useState<string>("unknown");

	useEffect(() => {
		if (dataProducerRef.current) {
			const dataChannel = (dataProducerRef.current as any)._dataChannel;
			if (dataChannel) {
				const updateState = () => {
					setDataChannelState(dataChannel.readyState);
					console.log("🔍 DataChannel state:", dataChannel.readyState);
				};

				dataChannel.addEventListener("open", updateState);
				dataChannel.addEventListener("close", updateState);
				dataChannel.addEventListener("error", updateState);

				// Initial state
				updateState();

				// Periodic check
				const interval = setInterval(updateState, 2000);
				return () => clearInterval(interval);
			}
		}
	}, [dataProducerRef.current]);

	// Display state in UI for debugging
	return (
		<>
			<div ref={containerRef} id="game-container">
			{/* Show components based on state */}

			<VideoInterface
				sendTransport={sendTransportRef.current}
				recvTransport={recvTransportRef.current} // Add this
				ws={wsRef.current}
				device={deviceRef.current!}
				clientId={clientIdRef.current}
				produceCallbackRef={videoProduceCallbackRef}
			/>
				{showChat && wsRef.current && (
					<ChatInterface
						ws={wsRef.current}
						userId={userid}
						onClose={() => setShowChat(false)}
					/>
				)}
			</div>
			<div>
				<button
					className="interface-toggle-btn"
					style={{ left: 24, top: 24 }}
					onClick={() => setShowChat(!showChat)}
					title="Toggle Chat">
					<BsChat size={28} />
				</button>
			</div>
			<div
				style={{
					position: "absolute",
					top: 10,
					right: 10,
					background: "rgba(0,0,0,0.8)",
					color: "white",
					padding: "5px",
				}}>
				DataChannel: {dataChannelState}
			</div>
		</>
	);
};

export default GameComponent;
