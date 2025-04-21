import { WebSocket, WebSocketServer } from "ws";
import { v4 } from "uuid";
import * as mediasoup from "mediasoup";
import {
	addUserToSpace,
	removeUserFromSpace,
	addUserToRoom,
	removeUserFromRoom,
} from "./services/membershipService";
import { createUser, getUserById } from "./services/userService"; // Add this import
import { getRoomById, isRoomInSpace } from "./services/roomService"; // Add this
import { Message, SpaceIdPayload, RoomIdPayload } from "./types/message.types";

let mediasoupWorker: mediasoup.types.Worker;
let mediasoupRouter: mediasoup.types.Router;

//function to setup mediasoup
async function createMediasoupWorker() {
	mediasoupWorker = await mediasoup.createWorker();
	mediasoupRouter = await mediasoupWorker.createRouter({
		mediaCodecs: [],
	});
	console.log("mediasoupWorker and router started");
}

createMediasoupWorker();

const PORT = Number(process.env.PORT) || 8080;
const wss = new WebSocketServer({ port: PORT });
console.log(`WebSocket server is running on ws://localhost:${PORT}`);

// Keep only this for mediasoup state
const roomsById = new Map<string, Room>();

class Client {
	id: string;
	ws: WebSocket;
	roomId: string | null;
	spaceId: string | null; // Track which space the client is in

	constructor(id: string, ws: WebSocket) {
		this.id = id;
		this.ws = ws;
		this.roomId = null;
		this.spaceId = null;
	}

	sendToSelf(message: Message): void {
		if (this.ws.readyState === WebSocket.OPEN) {
			this.ws.send(JSON.stringify(message));
		}
	}
}

// Room related class
class Room {
	id: string;
	clients: Map<string, Client>;
	mediasoupTransports: Map<string, mediasoup.types.WebRtcTransport>;
	dataProducers: Map<string, mediasoup.types.DataProducer>;
	dataConsumers: Map<string, mediasoup.types.DataConsumer[]>;

	constructor(roomId: string) {
		this.id = roomId;
		this.clients = new Map<string, Client>();
		this.mediasoupTransports = new Map();
		this.dataProducers = new Map();
		this.dataConsumers = new Map();
	}

	addClient(client: Client): void {
		this.clients.set(client.id, client);
		console.log(`Client ${client.id} added to room ${this.id}`);
	}

	removeClient(clientId: string): boolean {
		const client = this.clients.get(clientId);
		if (client) {
			this.clients.delete(clientId);
			console.log(`Client ${clientId} removed from room ${this.id}`);
			return true;
		}
		return false;
	}

	getClient(clientId: string): Client | undefined {
		return this.clients.get(clientId);
	}

	broadcastMessage(senderId: string | null, message: Message): void {
		const messageString = JSON.stringify(message);
		this.clients.forEach((client) => {
			if (
				(senderId === null || client.id !== senderId) &&
				client.ws.readyState === WebSocket.OPEN
			) {
				client.ws.send(messageString);
			}
		});
	}

	sendToClient(clientId: string, message: Message): void {
		const client = this.clients.get(clientId);
		if (client && client.ws.readyState === WebSocket.OPEN) {
			client.ws.send(JSON.stringify(message));
		}
	}

	isEmpty(): boolean {
		return this.clients.size === 0;
	}
}

// Helper: load or create the mediasoup Room stub
function getOrCreateRoom(roomId: string): Room {
	let r = roomsById.get(roomId);
	if (!r) {
		r = new Room(roomId);
		roomsById.set(roomId, r);
	}
	return r;
}

// WebSocket connection handling stuff
wss.on("connection", async (ws: WebSocket) => {
	const id = v4();
	const client = new Client(id, ws);
	console.log(`New client connected: ${id}`);

	// Create a temporary user for this connection
	try {
		await createUser({
			id, // Use the client ID as the user ID
			account: `temp-${id.substring(0, 8)}`,
			name: `Visitor-${id.substring(0, 5)}`,
			email: `temp-${id.substring(0, 8)}@example.com`,
			password: "temporary",
		});
		console.log(`Temporary user created for client: ${id}`);
	} catch (error) {
		console.error(`Failed to create temporary user: ${error}`);
	}

	ws.on("message", async (data: Buffer) => {
		try {
			// Parse the incoming message
			const message = JSON.parse(data.toString());
			console.log(`Received message from ${id}:`, message.type);
			await handleMessage(client, message);
		} catch (error) {
			console.log(`Error handling message from ${id}:`, error);
			client.sendToSelf({
				type: "error",
				payload: "Invalid message format",
			});
		}
	});

	ws.on("close", () => {
		console.log(`Client connection closed: ${id}`);
		handleDisconnect(client);
	});

	ws.on("error", (err) => {
		console.error(`WebSocket error for client ${id}:`, err);
	});
});

// Handle incoming messages from clients
async function handleMessage(client: Client, message: any): Promise<void> {
	if (!message || typeof message.type !== "string") {
		console.warn(`Received invalid message from ${client.id}`);
		client.sendToSelf({
			type: "error",
			payload: "Message must have a type field",
		});
		return;
	}

	try {
		switch (message.type) {
			case "joinRoom": {
				const { roomId } = message.payload;
				if (!client.spaceId) {
					return client.sendToSelf({
						type: "error",
						payload: "Must join a space before joining a room",
					});
				}

				const roomBelongsToSpace = await isRoomInSpace(roomId, client.spaceId);
				if (!roomBelongsToSpace) {
					return client.sendToSelf({
						type: "error",
						payload: "Room not in your current space",
					});
				}

				// Handle room change if already in a room
				if (client.roomId) {
					const oldRoom = roomsById.get(client.roomId);
					if (oldRoom) {
						oldRoom.removeClient(client.id);
					}
				}

				// Join the new room
				await addUserToRoom(client.id, roomId);
				client.roomId = roomId;

				// Get or create mediasoup room
				const msRoom = getOrCreateRoom(roomId);
				msRoom.addClient(client);
				msRoom.dataConsumers.set(client.id, []);

				client.sendToSelf({
					type: "joinedRoom", // CHANGE FROM "joinRoom" to match RoomResponseMessage
					payload: { roomId },
				});
				break;
			}

			case "leaveRoom": {
				const { roomId } = message.payload;
				if (client.roomId !== roomId) {
					return client.sendToSelf({
						type: "error",
						payload: `Not in room ${roomId}`,
					});
				}

				await removeUserFromRoom(client.id);
				client.roomId = null;

				const msRoom = roomsById.get(roomId);
				if (msRoom) {
					msRoom.removeClient(client.id);
					client.sendToSelf({
						type: "leftRoom",
						payload: { roomId },
					});
				} else {
					client.sendToSelf({
						type: "error",
						payload: `Room ${roomId} not found`,
					});
				}
				break;
			}

			case "createWebRtcTransport": {
				if (!client.roomId) {
					return client.sendToSelf({
						type: "error",
						payload: "Must join a room first",
					});
				}

				const msRoom = roomsById.get(client.roomId);
				if (!msRoom) {
					return client.sendToSelf({
						type: "error",
						payload: "Room not found",
					});
				}

				const transport = await mediasoupRouter.createWebRtcTransport({
					listenIps: [{ ip: "0.0.0.0", announcedIp: "" }],
					enableTcp: true,
					enableUdp: true,
					preferUdp: true,
					enableSctp: true, // Add SCTP support for DataChannels
					numSctpStreams: {
						// Configure SCTP streams
						OS: 1024,
						MIS: 1024,
					},
				});

				msRoom.mediasoupTransports.set(transport.id, transport);
				client.sendToSelf({
					type: "webRtcTransportCreated",
					payload: {
						id: transport.id,
						iceCandidates: transport.iceCandidates,
						iceParameters: transport.iceParameters,
						dtlsParameters: transport.dtlsParameters,
					},
				});
				break;
			}

			case "connectWebRtcTransport": {
				const { transportId, dtlsParameters } = message.payload;
				if (!client.roomId) {
					return client.sendToSelf({
						type: "error",
						payload: "Must join a room first",
					});
				}

				const msRoom = roomsById.get(client.roomId);
				const transport = msRoom?.mediasoupTransports.get(transportId);

				if (transport) {
					await transport.connect({ dtlsParameters });
					client.sendToSelf({
						type: "webRtcTransportConnected",
						payload: { transportId },
					});
				} else {
					client.sendToSelf({
						type: "error",
						payload: "Transport not found",
					});
				}
				break;
			}

			case "produceData": {
				const { transportId, sctpStreamParameters, label, protocol } =
					message.payload;

				if (!client.roomId) {
					return client.sendToSelf({
						type: "error",
						payload: "Must join a room first",
					});
				}

				const msRoom = roomsById.get(client.roomId);
				const transport = msRoom?.mediasoupTransports.get(transportId);

				if (!transport) {
					return client.sendToSelf({
						type: "error",
						payload: "Transport not found",
					});
				}

				const dataProducer = await transport.produceData({
					sctpStreamParameters,
					label,
					protocol,
				});

				msRoom!.dataProducers.set(dataProducer.id, dataProducer);
				client.sendToSelf({
					type: "dataProduced",
					payload: {
						dataProducerId: dataProducer.id,
					},
				});

				//tell others there's a new msg producer
				msRoom!.broadcastMessage(client.id, {
					type: "newDataProducer",
					payload: { producerId: dataProducer.id },
				});
				break;
			}

			case "consumeData": {
				const { producerId, transportId } = message.payload;

				if (!client.roomId) {
					return client.sendToSelf({
						type: "error",
						payload: "Must join a room first",
					});
				}

				const msRoom = roomsById.get(client.roomId);
				if (!msRoom) {
					return client.sendToSelf({
						type: "error",
						payload: "Room not found",
					});
				}

				const transport = msRoom.mediasoupTransports.get(transportId);
				const producer = msRoom.dataProducers.get(producerId);

				if (!transport || !producer) {
					return client.sendToSelf({
						type: "error",
						payload: "Transport or producer not found",
					});
				}

				const consumer = await transport.consumeData({
					dataProducerId: producerId,
				});

				if (!msRoom.dataConsumers.get(client.id)) {
					msRoom.dataConsumers.set(client.id, []);
				}

				msRoom.dataConsumers.get(client.id)!.push(consumer);
				client.sendToSelf({
					type: "dataConsumerCreated",
					payload: {
						producerId,
						id: consumer.id,
						sctpStreamParameters: consumer.sctpStreamParameters,
						label: consumer.label,
						protocol: consumer.protocol,
					},
				});
				break;
			}

			default:
				client.sendToSelf({
					type: "error",
					payload: `Unknown message: ${message.type}`,
				});
		}
	} catch (error) {
		console.error(`Error handling ${message.type}:`, error);
		client.sendToSelf({
			type: "error",
			payload: `Error processing ${message.type}: ${(error as Error).message}`,
		});
	}
}

async function handleDisconnect(client: Client): Promise<void> {
	if (!client) return;

	console.log(`Handling disconnect for client: ${client.id}`);

	// Update DB first
	if (client.roomId) {
		await removeUserFromRoom(client.id);
		// Clean up mediasoup
		const msRoom = roomsById.get(client.roomId);
		if (msRoom) {
			msRoom.removeClient(client.id);
		}
	}

	if (client.spaceId) {
		await removeUserFromSpace(client.id);
	}

	// Close socket if needed
	if (
		client.ws.readyState !== WebSocket.CLOSED &&
		client.ws.readyState !== WebSocket.CLOSING
	) {
		client.ws.terminate();
	}
}

// Type guards
function isValidRoomPayload(payload: any): payload is RoomIdPayload {
	return (
		typeof payload === "object" &&
		payload !== null &&
		typeof payload.roomId === "string"
	);
}

function isValidSpacePayload(payload: any): payload is SpaceIdPayload {
	return (
		typeof payload === "object" &&
		payload !== null &&
		typeof payload.spaceId === "string"
	);
}
