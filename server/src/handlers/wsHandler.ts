import { WebSocketServer } from "ws";
import { v4 as uuidv4, v4 } from "uuid";
import { Client } from "../classes/Client";
import * as authHandler from "../handlers/authHandler";
import * as roomHandler from "../handlers/roomHandler";
import { handlePlayerPosUpdate } from "../handlers/playerPosUpdate";
import { Message } from "../types/message.types";
import { roomsById } from "../state/state";
import http from "http";
import { mediasoupRouter } from "../mediasoup/setup";
import { joinSpace } from "../services/spaceServices";
import {
	createWebRtcTransport,
	produceData,
	consumeData,
	connectWebRtcTransport,
	produceMedia,
	consumeMedia,
	restartIce,
} from "./mediaHandler";

export function startWebsocketServer(server: http.Server, path = "/ws") {
	const wss = new WebSocketServer({ server, path });
	
	console.log(`🔌 WebSocket server started on path: ${path}`);
	
	wss.on("connection", async (ws, req) => {
		const url = req.url || " ";
		const fullUrl = new URL(url, `http://${req.headers.host}`);
		const userId = decodeURI(fullUrl.searchParams.get("userId") || "");
		
		if (userId.length == 0) {
			console.log("❌ WebSocket connection rejected: No userId provided");
			ws.close(1008, "userId required");
			return;
		}
		
		//we make a client obj for each user
		const clientid = uuidv4().toString();
		const client = new Client(clientid, userId, ws);
		
		console.log(`✅ WebSocket connected: userId=${userId}, clientId=${clientid.substr(0, 8)}`);
		
		ws.on("message", async (raw) => {
			let msg;
			try {
				msg = JSON.parse(raw.toString());
				const authenticated = authHandler.handleAuthentication(client);
				if (!authenticated) {
					return client.sendToSelf({
						type: "error",
						payload: "Not authenticated user",
					});
				}
			} catch {
				return client.sendToSelf({
					type: "error",
					payload: "Invalid JSON format",
				});
			}
			
			// Log non-movement messages for debugging
			if (msg.type !== "playerMovementUpdate") {
				console.log(`📨 WS message from ${userId}: ${msg.type}`);
			}
			
			let res;
			switch (msg.type) {
				case "getRtpCapabilites":
					client.sendToSelf({
						type: "GotRouterRtpCapabilities",
						payload: mediasoupRouter.rtpCapabilities,
					});
					break;

				case "createWebRtcTransportSend":
				case "createWebRtcTransportRecv":
					await createWebRtcTransport(client, msg);
					break;

				case "connectWebRtcTransport":
					await connectWebRtcTransport(client, msg);
					break;

				case "produceData":
					// call your existing helper
					await produceData(client, msg);
					break;

				// ✅ NEW: Handle ICE restart
				case "restartIce":
					await restartIce(client, msg);
					break;

				case "joinSpace":
					await joinSpace(msg.payload.spaceId, userId);
					break;

				case "joinRoom":
					res = await roomHandler.handleJoinRoom(client, msg);
					client.sendToSelf({
						type: "JoinedRoom",
						payload: { clientId: clientid },
					});
					break;
				case "leaveRoom":
					res = await roomHandler.handleLeaveRoom(client, msg);
					break;

				case "consumeData":
					await consumeData(client, msg);
					break;

				case "publicChat":
					await roomHandler.handleChatMessage(client, msg);
					break;

				case "proximityChat":
					await roomHandler.handleProximityChat(client, msg);
					break;

				case "playerMovementUpdate":
					const { roomId, playerUserId, pos, direction, isMoving } =
						msg.payload;

					if (!client.roomId || !pos) {
						return client.sendToSelf({
							type: "error",
							payload: "Invalid movement data or not in room",
						});
					}

					// Update position in room
					const room = roomsById.get(client.roomId);
					if (room && client.userId) {
						// Update stored position
						room.playerPositions.set(client.userId, pos);

						const movementMsg = {
							type: "playerMovementUpdate",
							payload: {
								isMoving: isMoving,
								playerUserId: client.userId, // Use actual client.userId
								pos: pos,
								direction: direction,
								timestamp: Date.now(),
							},
						};

						// ✅ PRIMARY: Broadcast via DataProducers (WebRTC DataChannel)
						let dataChannelSuccess = false;
						room.dataProducers.forEach((producer, producerUserId) => {
							// Don't send to self
							if (producerUserId === client.userId) return;

							try {
								producer.send(JSON.stringify(movementMsg));
								dataChannelSuccess = true;
							} catch (error) {
								console.error(
									`🚨 Failed to send movement to DataProducer ${producerUserId}:`,
									error
								);
							}
						});

						// ✅ FALLBACK: Also broadcast via WebSocket for reliability
						room.broadcastMessage(client.userId, movementMsg);

						// Periodic debug logging (every 30th message to avoid spam)
						if (Math.random() < 0.03) { // ~3% of messages
							console.log(`🚶 Movement update from ${client.userId}: pos(${pos.posX.toFixed(0)}, ${pos.posY.toFixed(0)}), dir: ${direction}, moving: ${isMoving}, via DataChannel: ${dataChannelSuccess}`);
						}
					}
					break;

				//------------------video call handlers

				case "produceMedia":
					produceMedia(client, msg);
					break;
				case "consumeMedia":
					consumeMedia(client, msg);
					break;
			}
		});

		ws.on("close", async () => {
			console.log(`🔌 WebSocket closed for user: ${client.userId}`);
			await handleDisconnect(client);
		});

		ws.on("error", async (error) => {
			console.error(`❌ WebSocket error for client ${client.userId}:`, error);
			await handleDisconnect(client);
		});
	});
	
	// Log WebSocket server stats periodically
	setInterval(() => {
		console.log(`📊 WebSocket Stats: ${wss.clients.size} connected clients, ${roomsById.size} active rooms`);
	}, 60000); // Every minute
}

// Update your handleDisconnect function:

async function handleDisconnect(client: Client): Promise<void> {
	console.log(`🚪 Handling disconnect for client ${client.userId}`);

	if (!client.userId) {
		console.warn("⚠️  Client has no userId, skipping cleanup");
		return;
	}

	if (client.roomId) {
		const room = roomsById.get(client.roomId);
		if (room) {
			// ✅ Notify other clients BEFORE cleanup
			room.broadcastMessage(null, {
				type: "clientLeft",
				payload: { clientId: client.userId },
			});

			// ✅ CLEAN UP: Close and remove client's DataProducers
			const clientDataProducer = room.dataProducers.get(client.userId);
			if (clientDataProducer && !clientDataProducer.closed) {
				console.log(`  🗑️ Closing DataProducer for ${client.userId}`);
				clientDataProducer.close();
				room.dataProducers.delete(client.userId);

				// ✅ NOTIFY: Tell other clients this producer is gone
				room.broadcastMessage(null, {
					type: "dataProducerClosed",
					payload: { producerId: clientDataProducer.id, userId: client.userId },
				});
			}

			// ✅ CLEAN UP: Close and remove client's MediaProducers (audio/video)
			const producersToDelete: string[] = [];
			room.mediaProducers.forEach((producer, key) => {
				if (client.userId && key.startsWith(client.userId)) {
					console.log(`  🗑️ Closing MediaProducer ${producer.kind} for ${client.userId}`);
					if (!producer.closed) {
						producer.close();
					}
					producersToDelete.push(key);

					// Notify others
					room.broadcastMessage(null, {
						type: "mediaProducerClosed",
						payload: { producerId: producer.id, userId: client.userId },
					});
				}
			});
			producersToDelete.forEach(key => room.mediaProducers.delete(key));

			// ✅ CLEAN UP: Close data consumers for this client
			const consumers = room.dataConsumers.get(client.userId);
			if (consumers) {
				console.log(`  🗑️ Closing ${consumers.length} DataConsumers for ${client.userId}`);
				consumers.forEach((consumer) => {
					if (!consumer.closed) {
						consumer.close();
					}
				});
				room.dataConsumers.delete(client.userId);
			}

			// ✅ CLEAN UP: Close media consumers for this client
			const mediaConsumers = room.mediaConsumers.get(client.userId);
			if (mediaConsumers) {
				console.log(`  🗑️ Closing ${mediaConsumers.length} MediaConsumers for ${client.userId}`);
				mediaConsumers.forEach((consumer) => {
					if (!consumer.closed) {
						consumer.close();
					}
				});
				room.mediaConsumers.delete(client.userId);
			}

			// ✅ CLEAN UP: Close any transports for this client
			const transportsToDelete: string[] = [];
			room.allTransportsById.forEach((transport, transportId) => {
				if (transport.appData?.clientId === client.userId) {
					console.log(`  🗑️ Closing Transport ${transportId.substr(0, 8)} for ${client.userId}`);
					if (!transport.closed) {
						transport.close();
					}
					transportsToDelete.push(transportId);
				}
			});
			transportsToDelete.forEach(id => room.allTransportsById.delete(id));

			// Remove from clients map
			room.removeClient(client);
			console.log(`  ✅ Removed ${client.userId} from room ${client.roomId}`);

			// Clean up empty room
			if (room.isEmpty()) {
				roomsById.delete(client.roomId);
				console.log(`🗑️ Room ${client.roomId} deleted (was empty)`);
			} else {
				console.log(`  📊 Room ${client.roomId} now has ${room.clients.size} clients`);
			}
		}
	}

	console.log(`✅ Disconnect handled for ${client.userId}`);
}
