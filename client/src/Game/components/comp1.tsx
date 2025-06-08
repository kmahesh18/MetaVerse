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

	//webrtc initiliazers
	const sendTransportRef = useRef<types.Transport | null>(null);
	const recvTransportRef = useRef<types.Transport | null>(null);
	const producedataCallbackRef = useRef<any | null>(null);
	const dataProducerRef = useRef<types.DataProducer | null>(null);

	//game related ref's
	const roomSceneRef = useRef<any>(null);
	const dataConsumersRef = useRef<types.DataConsumer[]>([]);
	const phaserStartedRef = useRef(false);

	// //videocall ref's
	// const videoProducerRef = useRef<any>(null);
	// const audioProducerRef = useRef<any>(null);
	// const videoConsumerRef = useRef<any>(null);
	// const audioConsumerRef = useRef<any>(null);

	async function joinSpace() {
		if (!spaceId || !userid) return;
		try {
			await axios.post(`http://localhost:5001/api/spaces/${spaceId}/join`, {
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

			const protocol = window.location.protocol === "https:" ? "wss" : "ws";
			const wsUrl = `${protocol}://localhost:5001/ws?userId=${encodeURIComponent(
				userid
			)}`;
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
					} = msg.payload;

					sendTransportRef.current = deviceRef.current!.createSendTransport({
						id,
						iceParameters,
						iceCandidates,
						dtlsParameters,
						sctpParameters,
						iceServers: [
							{ urls: "stun:stun.l.google.com:19302" },
							{ urls: "stun:stun1.l.google.com:19302" },
						],
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
							});

						// Monitor DataChannel ready state
						const checkDataChannelState = () => {
							if (dataProducerRef.current?.readyState === "open") {
								console.log("✅ DataChannel is ready!");
								return;
							}

							if (dataProducerRef.current?.readyState === "connecting") {
								// console.log(
								// 	"⏳ DataChannel still connecting, checking again in 2s..."
								// );
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
						iceServers: [
							{ urls: "stun:stun.l.google.com:19302" },
							{ urls: "stun:stun1.l.google.com:19302" },
						],
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

				// ✅ HANDLE: New DataProducers from other players
				if (msg.type === "newDataProducer") {
					const { producerId } = msg.payload;
					if (recvTransportRef.current) {
						ws.send(
							JSON.stringify({
								type: "consumeData",
								payload: {
									producerId:producerId,
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
					const { id, producerId, sctpStreamParameters, label, protocol } =msg.payload;
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

	// Add this function to monitor ICE connection state
	// function monitorICEConnection(
	// 	transport: types.Transport,
	// 	transportType: string
	// ) {
	// 	let iceGatheringComplete = false;
	// 	let connectionTimeout: NodeJS.Timeout;

	// 	// Monitor ICE gathering
	// 	transport.on("icegatheringstatechange", () => {
	// 		console.log(
	// 			`📡 ${transportType} ICE gathering state:`,
	// 			transport.iceGatheringState
	// 		);
	// 		if (transport.iceGatheringState === "complete") {
	// 			iceGatheringComplete = true;
	// 			console.log(`✅ ${transportType} ICE gathering completed`);
	// 		}
	// 	});

	// 	// Monitor connection state
	// 	transport.on("connectionstatechange", () => {
	// 		console.log(
	// 			`🔗 ${transportType} connection state:`,
	// 			transport.connectionState
	// 		);

	// 		if (transport.connectionState === "connected") {
	// 			console.log(`✅ ${transportType} WebRTC connected!`);
	// 			if (connectionTimeout) clearTimeout(connectionTimeout);
	// 		} else if (transport.connectionState === "failed") {
	// 			console.error(`❌ ${transportType} WebRTC connection failed!`);
	// 			if (connectionTimeout) clearTimeout(connectionTimeout);
	// 		}
	// 	});

	// 	// Set a timeout for connection
	// 	connectionTimeout = setTimeout(() => {
	// 		if (transport.connectionState !== "connected") {
	// 			console.error(
	// 				`⏰ ${transportType} connection timeout after 30 seconds`
	// 			);
	// 			console.log(`Current state: ${transport.connectionState}`);
	// 			console.log(`ICE gathering complete: ${iceGatheringComplete}`);
	// 		}
	// 	}, 30000);
	// }

	return (
		<>
			<div ref={containerRef} id="game-container">
				{/* Show components based on state */}
				 
					<VideoInterface
						sendTransport={sendTransportRef.current}
						recvTransport={recvTransportRef.current}// Add this
						ws ={wsRef.current}
						clientId={clientIdRef.current}/>
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
		</>
	);
};

export default GameComponent;
