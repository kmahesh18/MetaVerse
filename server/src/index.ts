// import { WebSocket, WebSocketServer } from "ws";
// import { v4 } from "uuid";
// import * as mediasoup from "mediasoup";
// import {
// 	addUserToSpace,
// 	removeUserFromSpace,
// 	addUserToRoom,
// 	removeUserFromRoom,
// } from "./services/membershipService";
// import { createOrUpdateUser, getUserById } from "./services/userService"; // Add this import
// import { getRoomById, isRoomInSpace } from "./services/roomService"; // Add this
// import {
// 	Message,
// 	BroadcastPlayerPos,
// 	SpaceIdPayload,
// 	RoomIdPayload,
// 	AuthenticateMessage, // Import new type
// } from "./types/message.types";

// let mediasoupWorker: mediasoup.types.Worker;
// let mediasoupRouter: mediasoup.types.Router;

// //function to setup mediasoup
// async function createMediasoupWorker() {
// 	mediasoupWorker = await mediasoup.createWorker();
// 	mediasoupRouter = await mediasoupWorker.createRouter({
// 		mediaCodecs: [],
// 	});
// 	console.log("mediasoupWorker and router started");
// }

// createMediasoupWorker();

// const PORT = Number(process.env.PORT) || 8080;
// const wss = new WebSocketServer({ port: PORT });
// console.log(`WebSocket server is running on ws://localhost:${PORT}`);

// // Keep only this for mediasoup state
// const roomsById = new Map<string, Room>();

// class Client {
// 	id: string; // Unique ID for this specific connection instance
// 	ws: WebSocket;
// 	roomId: string | null;
// 	spaceId: string | null; // Track which space the client is in
// 	userId: string | null; // The actual User ID from your database
// 	isAuthenticated: boolean; // Flag to check if user ID has been validated

// 	constructor(id: string, ws: WebSocket) {
// 		this.id = id; // This is the temporary connection ID
// 		this.ws = ws;
// 		this.roomId = null;
// 		this.spaceId = null;
// 		this.userId = null; // Starts as null
// 		this.isAuthenticated = false; // Starts as false
// 	}

// 	sendToSelf(message: Message): void {
// 		if (this.ws.readyState === WebSocket.OPEN) {
// 			this.ws.send(JSON.stringify(message));
// 		}
// 	}
// }

// // Room related class
// class Room {
// 	id: string;
// 	clients: Map<string, Client>;
// 	mediasoupTransports: Map<string, mediasoup.types.WebRtcTransport>;
// 	dataProducers: Map<string, mediasoup.types.DataProducer>; //client to room pipeline
// 	dataConsumers: Map<string, mediasoup.types.DataConsumer[]>; //room to subscribed client's pipelines

// 	constructor(roomId: string) {
// 		this.id = roomId;
// 		this.clients = new Map<string, Client>();
// 		this.mediasoupTransports = new Map();
// 		this.dataProducers = new Map();
// 		this.dataConsumers = new Map();
// 	}

// 	addClient(client: Client): void {
// 		this.clients.set(client.id, client);
// 		console.log(`Client ${client.id} added to room ${this.id}`);
// 	}

// 	removeClient(clientId: string): boolean {
// 		const client = this.clients.get(clientId);
// 		if (client) {
// 			this.clients.delete(clientId);
// 			console.log(`Client ${clientId} removed from room ${this.id}`);
// 			return true;
// 		}
// 		return false;
// 	}

// 	getClient(clientId: string): Client | undefined {
// 		return this.clients.get(clientId);
// 	}

// 	broadcastMessage(senderId: string | null, message: Message): void {
// 		const messageString = JSON.stringify(message);
// 		this.clients.forEach((client) => {
// 			if (
// 				(senderId === null || client.id !== senderId) &&
// 				client.ws.readyState === WebSocket.OPEN
// 			) {
// 				client.ws.send(messageString);
// 			}
// 		});
// 	}

// 	sendToClient(clientId: string, message: Message): void {
// 		const client = this.clients.get(clientId);
// 		if (client && client.ws.readyState === WebSocket.OPEN) {
// 			client.ws.send(JSON.stringify(message));
// 		}
// 	}

// 	isEmpty(): boolean {
// 		return this.clients.size === 0;
// 	}
// }

// // Helper: load or create the mediasoup Room stub
// function getOrCreateRoom(roomId: string): Room {
// 	let r = roomsById.get(roomId);
// 	if (!r) {
// 		r = new Room(roomId);
// 		roomsById.set(roomId, r);
// 	}
// 	return r;
// }

// // WebSocket connection handling stuff
// wss.on("connection", async (ws: WebSocket) => {
// 	const connectionId = v4(); // Temporary ID for this connection
// 	const client = new Client(connectionId, ws);
// 	console.log(`New client connected: ${connectionId}`);

// 	ws.on("message", async (data: Buffer) => {
// 		try {
// 			const message = JSON.parse(data.toString());
// 			// Log received message type, distinguish between authenticated/unauthenticated
// 			if (client.isAuthenticated) {
// 				console.log(
// 					`Received message from user ${client.userId} (conn: ${client.id}):`,
// 					message.type
// 				);
// 			} else {
// 				console.log(
// 					`Received message from unauthenticated connection ${client.id}:`,
// 					message.type
// 				);
// 			}
// 			await handleMessage(client, message);
// 		} catch (error) {
// 			console.log(`Error handling message from ${client.id}:`, error);
// 			client.sendToSelf({
// 				type: "error",
// 				payload: "Invalid message format",
// 			});
// 		}
// 	});

// 	ws.on("close", () => {
// 		console.log(`Client connection closed: ${client.id}`);
// 		handleDisconnect(client); // Pass the client object
// 	});

// 	ws.on("error", (err) => {
// 		console.error(`WebSocket error for client ${connectionId}:`, err);
// 	});
// });

// // Map to track player positions
// const playerPositions = new Map<string, { posX: number; posY: number }>();

// // Function to get the current player positions map
// function getPlayerPositions(): Map<string, { posX: number; posY: number }> {
// 	return playerPositions;
// }

// // Handle incoming messages from clients
// async function handleMessage(client: Client, message: any): Promise<void> {
// 	if (!message || typeof message.type !== "string") {
// 		console.warn(`Received invalid message from ${client.id}`);
// 		client.sendToSelf({
// 			type: "error",
// 			payload: "Message must have a type field",
// 		});
// 		return;
// 	}

// 	// If client is not authenticated, only allow 'authenticate' message
// 	if (!client.isAuthenticated && message.type !== "authenticate") {
// 		console.warn(
// 			`Connection ${client.id} tried action '${message.type}' before authenticating.`
// 		);
// 		client.sendToSelf({ type: "error", payload: "Authentication required" });
// 		// Optionally close the connection for security
// 		// client.ws.close();
// 		return;
// 	}

// 	try {
// 		switch (message.type) {
// 			case "authenticate": {
// 				// This case should only run if client is NOT already authenticated
// 				if (client.isAuthenticated) {
// 					console.warn(
// 						`Client ${client.userId} sent authenticate message again.`
// 					);
// 					return; // Or send an error
// 				}

// 				const { userId } = (message as AuthenticateMessage).payload;
// 				if (!userId || typeof userId !== "string") {
// 					client.sendToSelf({
// 						type: "error",
// 						payload: "Invalid authentication payload",
// 					});
// 					return;
// 				}

// 				// Validate the user ID against the database
// 				const user = await getUserById(userId);
// 				if (user) {
// 					client.userId = user.id; // Store the validated user ID
// 					client.isAuthenticated = true;
// 					console.log(
// 						`Connection ${client.id} authenticated as user ${client.userId}`
// 					);

// 					if (client.userId) {
// 						client.sendToSelf({
// 							type: "authenticated",
// 							payload: { userId: client.userId },
// 						});
// 					} else {
// 						client.sendToSelf({
// 							type: "error",
// 							payload: "Authentication failed: User ID is null",
// 						});
// 					}
// 					// You might want to load user's current space/room here if needed
// 					// client.spaceId = user.spaceId;
// 					// client.roomId = user.roomId;
// 				} else {
// 					console.warn(
// 						`Authentication failed for connection ${client.id}: User ${userId} not found.`
// 					);
// 					client.sendToSelf({
// 						type: "error",
// 						payload: "Authentication failed: User not found",
// 					});
// 					// Optionally close the connection
// 					// client.ws.close();
// 				}
// 				break;
// 			}

// 			case "joinRoom": {
// 				// Authentication check (already implicitly done by the check at the function start)
// 				// Ensure client.userId is not null (TypeScript might need explicit check)
// 				if (!client.userId) return; // Should not happen if isAuthenticated is true

// 				const { roomId } = message.payload;
// 				if (!client.spaceId) {
// 					return client.sendToSelf({
// 						type: "error",
// 						payload: "Must join a space before joining a room",
// 					});
// 				}

// 				const roomBelongsToSpace = await isRoomInSpace(roomId, client.spaceId);
// 				if (!roomBelongsToSpace) {
// 					return client.sendToSelf({
// 						type: "error",
// 						payload: "Room not in your current space",
// 					});
// 				}

// 				// Handle room change if already in a room
// 				if (client.roomId) {
// 					const oldRoom = roomsById.get(client.roomId);
// 					if (oldRoom) {
// 						oldRoom.removeClient(client.id);
// 					}
// 				}

// 				// Join the new room using the authenticated userId
// 				await addUserToRoom(client.userId, roomId); // Use client.userId
// 				client.roomId = roomId;

// 				// Get or create mediasoup room
// 				const msRoom = getOrCreateRoom(roomId);
// 				msRoom.addClient(client);
// 				msRoom.dataConsumers.set(client.id, []);
// 				client.sendToSelf({
// 					type: "joinedRoom", // CHANGE FROM "joinRoom" to match RoomResponseMessage
// 					payload: { roomId },
// 				});
// 				break;
// 			}

// 			case "leaveRoom": {
// 				// Authentication check
// 				if (!client.userId) return;

// 				const { roomId } = message.payload;
// 				if (client.roomId !== roomId) {
// 					return client.sendToSelf({
// 						type: "error",
// 						payload: `Not in room ${roomId}`,
// 					});
// 				}

// 				await removeUserFromRoom(client.userId); // Use client.userId
// 				client.roomId = null;

// 				const msRoom = roomsById.get(roomId);
// 				if (msRoom) {
// 					msRoom.removeClient(client.id);
// 					client.sendToSelf({
// 						type: "leftRoom",
// 						payload: { roomId },
// 					});
// 				} else {
// 					client.sendToSelf({
// 						type: "error",
// 						payload: `Room ${roomId} not found`,
// 					});
// 				}
// 				break;
// 			}

// 			case "createWebRtcTransport": {
// 				// Authentication check
// 				if (!client.userId || !client.roomId) {
// 					return client.sendToSelf({
// 						type: "error",
// 						payload: "Must be authenticated and in a room first",
// 					});
// 				}

// 				const msRoom = roomsById.get(client.roomId);
// 				if (!msRoom) {
// 					return client.sendToSelf({
// 						type: "error",
// 						payload: "Room not found",
// 					});
// 				}

// 				const transport = await mediasoupRouter.createWebRtcTransport({
// 					listenIps: [{ ip: "0.0.0.0", announcedIp: "" }],
// 					enableTcp: true,
// 					enableUdp: true,
// 					preferUdp: true,
// 					enableSctp: true, // Add SCTP support for DataChannels
// 					numSctpStreams: {
// 						// Configure SCTP streams
// 						OS: 1024,
// 						MIS: 1024,
// 					},
// 				});

// 				msRoom.mediasoupTransports.set(transport.id, transport);
// 				client.sendToSelf({
// 					type: "webRtcTransportCreated",
// 					payload: {
// 						id: transport.id,
// 						iceCandidates: transport.iceCandidates,
// 						iceParameters: transport.iceParameters,
// 						dtlsParameters: transport.dtlsParameters,
// 					},
// 				});
// 				break;
// 			}

// 			case "connectWebRtcTransport": {
// 				// Authentication check
// 				if (!client.userId || !client.roomId) {
// 					return client.sendToSelf({
// 						type: "error",
// 						payload: "Must be authenticated and in a room first",
// 					});
// 				}

// 				const { transportId, dtlsParameters } = message.payload;
// 				const msRoom = roomsById.get(client.roomId);
// 				const transport = msRoom?.mediasoupTransports.get(transportId);

// 				if (transport) {
// 					await transport.connect({ dtlsParameters });
// 					client.sendToSelf({
// 						type: "webRtcTransportConnected",
// 						payload: { transportId },
// 					});
// 				} else {
// 					client.sendToSelf({
// 						type: "error",
// 						payload: "Transport not found",
// 					});
// 				}
// 				break;
// 			}

// 			case "produceData": {
// 				// Authentication check
// 				if (!client.userId || !client.roomId) {
// 					return client.sendToSelf({
// 						type: "error",
// 						payload: "Must be authenticated and in a room first",
// 					});
// 				}

// 				const { transportId, sctpStreamParameters, label, protocol } =
// 					message.payload;

// 				const msRoom = roomsById.get(client.roomId);
// 				const transport = msRoom?.mediasoupTransports.get(transportId);

// 				if (!transport) {
// 					return client.sendToSelf({
// 						type: "error",
// 						payload: "Transport not found",
// 					});
// 				}

// 				const dataProducer = await transport.produceData({
// 					sctpStreamParameters,
// 					label,
// 					protocol,
// 				});

// 				msRoom!.dataProducers.set(dataProducer.id, dataProducer);
// 				client.sendToSelf({
// 					type: "dataProduced",
// 					payload: {
// 						dataProducerId: dataProducer.id,
// 					},
// 				});

// 				//tell others there's a new msg producer
// 				msRoom!.broadcastMessage(client.id, {
// 					type: "newDataProducer",
// 					payload: { producerId: dataProducer.id },
// 				});
// 				break;
// 			}

// 			case "consumeData": {
// 				// Authentication check
// 				if (!client.userId || !client.roomId) {
// 					return client.sendToSelf({
// 						type: "error",
// 						payload: "Must be authenticated and in a room first",
// 					});
// 				}

// 				const { producerId, transportId } = message.payload;

// 				const msRoom = roomsById.get(client.roomId);
// 				if (!msRoom) {
// 					return client.sendToSelf({
// 						type: "error",
// 						payload: "Room not found",
// 					});
// 				}

// 				const transport = msRoom.mediasoupTransports.get(transportId);
// 				const producer = msRoom.dataProducers.get(producerId);

// 				if (!transport || !producer) {
// 					return client.sendToSelf({
// 						type: "error",
// 						payload: "Transport or producer not found",
// 					});
// 				}

// 				const consumer = await transport.consumeData({
// 					dataProducerId: producerId,
// 				});

// 				if (!msRoom.dataConsumers.get(client.id)) {
// 					msRoom.dataConsumers.set(client.id, []);
// 				}

// 				msRoom.dataConsumers.get(client.id)!.push(consumer);
// 				client.sendToSelf({
// 					type: "dataConsumerCreated",
// 					payload: {
// 						producerId,
// 						id: consumer.id,
// 						sctpStreamParameters: consumer.sctpStreamParameters,
// 						label: consumer.label,
// 						protocol: consumer.protocol,
// 					},
// 				});
// 				break;
// 			}

// 			case "playerPosUpdate": {
// 				// Authentication check
// 				if (!client.userId || !client.roomId) {
// 					return client.sendToSelf({
// 						type: "error",
// 						payload: "Must be authenticated and in a room first",
// 					});
// 				}

// 				const { posX, posY } = message.payload;

// 				if (typeof posX !== "number" || typeof posY !== "number") {
// 					return client.sendToSelf({
// 						type: "error",
// 						payload: "Invalid position data",
// 					});
// 				}

// 				// Update the player's position in the map
// 				playerPositions.set(client.userId, { posX, posY });

// 				// Broadcast the updated position to other clients in the room
// 				const msRoom = roomsById.get(client.roomId);
// 				if (msRoom) {
// 					msRoom.broadcastMessage(client.id, {
// 						type: "broadcastPlayerPos",
// 						payload: {
// 							userId: client.userId,
// 							position: { x: posX, y: posY }
// 						},
// 					});
// 				}

// 				break;
// 			}

// 			// Add similar authentication checks for other relevant message types like joinSpace, leaveSpace etc.

// 			default:
// 				client.sendToSelf({
// 					type: "error",
// 					payload: `Unknown message: ${message.type}`,
// 				});
// 		}
// 	} catch (error) {
// 		console.error(`Error handling ${message.type}:`, error);
// 		client.sendToSelf({
// 			type: "error",
// 			payload: `Error processing ${message.type}: ${(error as Error).message}`,
// 		});
// 	}
// }

// async function handleDisconnect(client: Client): Promise<void> {
// 	if (!client) return;

// 	// Perform DB cleanup only if the client was authenticated
// 	if (client.isAuthenticated && client.userId) {
// 		console.log(
// 			`Handling disconnect for authenticated user: ${client.userId} (connection: ${client.id})`
// 		);

// 		// Update DB first using the actual userId
// 		if (client.roomId) {
// 			await removeUserFromRoom(client.userId); // Use actual userId
// 			// Clean up mediasoup state associated with this connection
// 			const msRoom = roomsById.get(client.roomId);
// 			if (msRoom) {
// 				// Close consumers associated with this client's connection ID
// 				const consumers = msRoom.dataConsumers.get(client.id);
// 				consumers?.forEach((consumer) => consumer.close());
// 				msRoom.dataConsumers.delete(client.id);
// 				msRoom.removeClient(client.id); // Use connection ID here
// 				msRoom.broadcastMessage(null, {
// 					type: "clientLeft",
// 					payload: { clientId: client.userId },
// 				});

// 				// If room is empty, remove it from memory map
// 				if (msRoom.isEmpty()) {
// 					roomsById.delete(client.roomId);
// 					console.log(`Removed empty room ${client.roomId} from memory.`);
// 				}
// 			}
// 		}

// 		if (client.spaceId) {
// 			await removeUserFromSpace(client.userId); // Use actual userId
// 			// Add space-level cleanup if necessary
// 		}
// 	} else {
// 		console.log(
// 			`Handling disconnect for unauthenticated connection: ${client.id}`
// 		);
// 		// No DB cleanup needed if they never authenticated
// 		// Potentially clean up any temporary resources associated only with the connection ID if applicable
// 	}
// }


// async function fullyJoinRoom(client: Client, roomId: string, dtlsParameters: any, sctpStreamParameters: any, label: string, protocol: string) {
//     // 1. Add client to room
//     const msRoom = getOrCreateRoom(roomId);
//     msRoom.addClient(client);

//     // 2. Create WebRTC transport for this client
//     const transport = await mediasoupRouter.createWebRtcTransport({
//         listenIps: [{ ip: "0.0.0.0", announcedIp: "" }],
//         enableTcp: true,
//         enableUdp: true,
//         preferUdp: true,
//         enableSctp: true,
//         numSctpStreams: { OS: 1024, MIS: 1024 },
//     });
//     msRoom.mediasoupTransports.set(transport.id, transport);

//     // 3. Connect transport
//     await transport.connect({ dtlsParameters });

//     // 4. Produce data (create DataProducer)
//     const dataProducer = await transport.produceData({
//         sctpStreamParameters,
//         label,
//         protocol,
//     });
//     msRoom.dataProducers.set(dataProducer.id, dataProducer);

//     // 5. Notify everyone in the room about the new player
//     // msRoom.broadcastMessage(null, {
//     //     type: "playerJoined",
//     //     payload: { userId: client.userId, clientId: client.id, dataProducerId: dataProducer.id },
//     // });

//     // 6. Consume data from all existing producers (except self)
//     for (const [producerId, producer] of msRoom.dataProducers.entries()) {
//         if (producerId === dataProducer.id) continue; // skip own producer
//         const dataConsumer = await transport.consumeData({ dataProducerId: producerId });
//         if (!msRoom.dataConsumers.get(client.id)) msRoom.dataConsumers.set(client.id, []);
//         msRoom.dataConsumers.get(client.id)!.push(dataConsumer);

//         // Notify client about the new data consumer
//         client.sendToSelf({
//             type: "dataConsumerCreated",
//             payload: {
//                 producerId,
//                 id: dataConsumer.id,
//                 sctpStreamParameters: dataConsumer.sctpStreamParameters,
//                 label: dataConsumer.label,
//                 protocol: dataConsumer.protocol,
//             },
//         });
//     }

//     // 7. For all other clients, consume the new producer
//     for (const [otherClientId, otherClient] of msRoom.clients.entries()) {
//         if (otherClientId === client.id) continue;
//         const otherTransport = msRoom.mediasoupTransports.values().next().value; // You may want to track which transport belongs to which client
//         if (!otherTransport) continue;
//         const dataConsumer = await otherTransport.consumeData({ dataProducerId: dataProducer.id });
//         if (!msRoom.dataConsumers.get(otherClientId)) msRoom.dataConsumers.set(otherClientId, []);
//         msRoom.dataConsumers.get(otherClientId)!.push(dataConsumer);

//         // Notify other client about the new data consumer
//         otherClient.sendToSelf({
//             type: "dataConsumerCreated",
//             payload: {
//                 producerId: dataProducer.id,
//                 id: dataConsumer.id,
//                 sctpStreamParameters: dataConsumer.sctpStreamParameters,
//                 label: dataConsumer.label,
//                 protocol: dataConsumer.protocol,
//             },
//         });
//     }

//     // 8. Notify the joining client about their own producer
//     client.sendToSelf({
//         type: "dataProduced",
//         payload: { dataProducerId: dataProducer.id },
//     });
// }