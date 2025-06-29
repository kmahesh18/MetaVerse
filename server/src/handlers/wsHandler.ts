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
	wss.on("connection", async (ws, req) => {
		const url = req.url || " ";
		const fullUrl = new URL(url, `http://${req.headers.host}`);
		const userId = decodeURI(fullUrl.searchParams.get("userId") || "");
		if (userId.length == 0) {
			console.log("NO userid found check again");
			return;
		}
		//we make a client obj for each user
		const clientid = uuidv4().toString();
		const client = new Client(clientid, userId, ws);
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
					if (room) {
						if (!client.userId) {
							console.log("error at player moment update");
							return;
						}
						room.playerPositions.set(client.userId, pos);

						room.dataProducers.forEach((producer, producerId) => {
							// Find which client owns this producer
							const ownerClient = Array.from(room.clients.values()).find(
								(c) => {
									// You might need to track which client owns which producer
									return true; // For now, broadcast to all
								}
							);

							if (ownerClient && ownerClient.userId !== client.userId) {
								try {
									producer.send(
										JSON.stringify({
											type: "playerMovementUpdate",
											payload: {
												isMoving: isMoving,
												playerUserId: playerUserId,
												pos: pos,
												direction: direction,
												timestamp: Date.now(),
											},
										})
									);
								} catch (error) {
									console.log("Error broadcasting via DataProducer:", error);
								}
							}
						});
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
			await handleDisconnect(client);
			console.log("Client disconnect succesfully");
		});

		ws.on("error", async (error) => {
			console.error(`WebSocket error for client ${client.userId}:`, error);
			await handleDisconnect(client);
		});
	});
}

// Update your handleDisconnect function:

async function handleDisconnect(client: Client): Promise<void> {
	console.log(`Handling disconnect for client ${client.userId}`);

	if (client.roomId) {
		const room = roomsById.get(client.roomId);
		if (room) {
			// ✅ CLEAN UP: Close and remove client's DataProducer
			room.broadcastMessage(null, {
				type: "clientLeft",
				payload: { clientId: client.userId },
			});
			room.dataProducers.forEach((producer, producerId) => {
				if ((producer as any).appData?.clientId === client.userId) {
					producer.close();
					room.dataProducers.delete(producerId);
					console.log(
						`Cleaned up DataProducer ${producerId} for disconnected client ${client.userId}`
					);

					// ✅ NOTIFY: Tell other clients this producer is gone
					room.broadcastMessage(null, {
						type: "dataProducerClosed",
						payload: { producerId },
					});
				}
			});

			// Remove from clients map
			room.removeClient(client);

			// Close any transports for this client
			const transports = Array.from(room.allTransportsById.values()).filter(
				(transport) => transport.appData?.clientId === client.userId
			);
			transports.forEach((transport) => transport.close());

			// Close any data consumers for this client
			if (!client.userId) {
				console.log("userId not found at handleDisonnect in wshandler");
				return;
			}
			const consumers = room.dataConsumers.get(client.userId);
			if (consumers) {
				consumers.forEach((consumer) => consumer.close());
				room.dataConsumers.delete(client.userId);
			}
			
			
			room.mediaProducers?.forEach((producer, producerId) => {
    if ((producer as any).appData?.clientId === client.userId) {
      producer.close();
      room.mediaProducers!.delete(producerId);
      console.log(`🗑️ Cleaned up MediaProducer ${producerId} for ${client.userId}`);
      // notify the others so they can remove that box
      room.broadcastMessage(null, {
        type: "mediaProducerClosed",
        payload: { producerId },
      });
    }
  });

			// Notify other clients that this client left

			// Clean up empty room
			if (room.isEmpty()) {
				roomsById.delete(client.roomId);
				console.log(`Room ${client.roomId} deleted (was empty)`);
			}
		}
	}
}
