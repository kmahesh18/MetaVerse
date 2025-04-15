import { WebSocket, WebSocketServer } from "ws";
import { v4 } from "uuid";

//-----------------------------------TYPES-----------------------------------
interface BaseMessage {
	type: string;
}

interface ErrorMessage extends BaseMessage {
	type: "error";
	payload: string;
}

interface RoomIdPayload {
	roomId: string;
}

interface SpaceIdPayload {
	spaceId: string;
}

interface ClientIdPayload {
	clientId: string;
}

interface JoinRoomMessage extends BaseMessage {
	type: "joinRoom";
	payload: RoomIdPayload;
}

interface LeaveRoomMessage extends BaseMessage {
	type: "leaveRoom";
	payload: RoomIdPayload;
}

interface JoinSpaceMessage extends BaseMessage {
	type: "joinSpace";
	payload: SpaceIdPayload;
}

interface LeaveSpaceMessage extends BaseMessage {
	type: "leaveSpace";
	payload: SpaceIdPayload;
}

interface RoomResponseMessage extends BaseMessage {
	type: "joinedRoom" | "leftRoom";
	payload: RoomIdPayload;
}

interface SpaceResponseMessage extends BaseMessage {
	type: "joinedSpace" | "leftSpace";
	payload: SpaceIdPayload & { rooms: string[] }; // Include room IDs
}

interface ClientLeftMessage extends BaseMessage {
	type: "clientLeft";
	payload: ClientIdPayload;
}

interface CreateSpaceMessage extends BaseMessage {
	type: "createSpace";
	payload: {
		numRooms?: number;
	};
}

interface SpaceCreatedMessage extends BaseMessage {
	type: "spaceCreated";
	payload: SpaceIdPayload & { rooms: string[] };
}

// Union type for all possible messages
type Message =
	| ErrorMessage
	| JoinRoomMessage
	| LeaveRoomMessage
	| JoinSpaceMessage
	| LeaveSpaceMessage
	| RoomResponseMessage
	| SpaceResponseMessage
	| ClientLeftMessage
	| CreateSpaceMessage
	| SpaceCreatedMessage;

//-----------------------------------SERVER SHITT-----------------------------------//

const PORT = Number(process.env.PORT) || 8080;
const wss = new WebSocketServer({ port: PORT });
console.log(`WebSocket server is running on ws://localhost:${PORT}`);
const spaces = new Map<string, Room[]>();
const roomIndex = new Map<string, { spaceId: string; room: Room }>();

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

function createSpace(numRooms: number): string {
	if (numRooms <= 0) {
		console.error("Number of rooms must be greater than zero");
		return "";
	}

	const spaceId = v4();
	const spaceRooms: Room[] = [];

	for (let i = 0; i < numRooms; i++) {
		const roomId = v4();
		const room = new Room(roomId);
		spaceRooms.push(room);

		// Index the room for quick lookups
		roomIndex.set(roomId, { spaceId, room });
	}

	spaces.set(spaceId, spaceRooms);
	console.log(`Space created with ID: ${spaceId} containing ${numRooms} rooms`);
	return spaceId;
}

//find a room by ID
function findRoom(roomId: string): Room | undefined {
	return roomIndex.get(roomId)?.room;
}

// get spaceId for a room
function getSpaceIdForRoom(roomId: string): string | undefined {
	return roomIndex.get(roomId)?.spaceId;
}

// get all room IDs in a space
function getRoomIdsInSpace(spaceId: string): string[] {
	const spaceRooms = spaces.get(spaceId);
	if (!spaceRooms) return [];
	return spaceRooms.map((room) => room.id);
}

// remove a room from a space
function removeRoomFromSpace(roomId: string): void {
	const roomInfo = roomIndex.get(roomId);
	if (roomInfo) {
		const { spaceId } = roomInfo;
		const spaceRooms = spaces.get(spaceId);

		if (spaceRooms) {
			const newRooms = spaceRooms.filter((room) => room.id !== roomId);

			if (newRooms.length === 0) {
				spaces.delete(spaceId);
				console.log(`Space ${spaceId} is now empty, removing.`);
			} else {
				// remaining rooms
				spaces.set(spaceId, newRooms);
			}
		}
		roomIndex.delete(roomId);
	}
}

// Room related shitt
class Room {
	id: string;
	clients: Map<string, Client>;

	constructor(roomId: string) {
		this.id = roomId;
		this.clients = new Map<string, Client>();
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

// WebSocket connection handling stuff
wss.on("connection", (ws: WebSocket) => {
	const id = v4();
	const client = new Client(id, ws);
	console.log(`New client connected: ${id}`);

	ws.on("message", (data: Buffer) => {
		try {
			// Parse the incoming message
			const message = JSON.parse(data.toString());
			console.log(`Received message from ${id}:`, message.type);
			handleMessage(client, message);
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
function handleMessage(client: Client, message: any): void {
	if (!message || typeof message.type !== "string") {
		console.warn(`Received invalid message from ${client.id}`);
		client.sendToSelf({
			type: "error",
			payload: "Message must have a type field",
		});
		return;
	}

	switch (message.type) {
		case "createSpace":
			const numRooms = message.payload?.numRooms || 1;
			const spaceId = createSpace(numRooms);
			client.sendToSelf({
				type: "spaceCreated",
				payload: { spaceId, rooms: getRoomIdsInSpace(spaceId) },
			});
			break;

		case "joinSpace":
			if (!isValidSpacePayload(message.payload)) {
				client.sendToSelf({
					type: "error",
					payload: "Invalid payload for joinSpace",
				});
				return;
			}
			handleJoinSpace(client, message.payload);
			break;

		case "leaveSpace":
			if (!isValidSpacePayload(message.payload)) {
				client.sendToSelf({
					type: "error",
					payload: "Invalid payload for leaveSpace",
				});
				return;
			}
			handleLeaveSpace(client, message.payload.spaceId);
			break;

		case "joinRoom":
			if (!isValidRoomPayload(message.payload)) {
				client.sendToSelf({
					type: "error",
					payload: "Invalid payload for joinRoom",
				});
				return;
			}
			handleJoinRoom(client, message.payload);
			break;

		case "leaveRoom":
			if (!isValidRoomPayload(message.payload)) {
				client.sendToSelf({
					type: "error",
					payload: "Invalid payload for leaveRoom",
				});
				return;
			}
			handleLeaveRoom(client, message.payload.roomId);
			break;

		default:
			client.sendToSelf({
				type: "error",
				payload: `Unknown message type: ${message.type}`,
			});
	}
}

function handleJoinSpace(client: Client, payload: SpaceIdPayload): void {
	const { spaceId } = payload;
	if (client.spaceId) {
		console.warn(
			`Client ${client.id} tried to join space ${spaceId} but is already in space ${client.spaceId}`
		);
		client.sendToSelf({
			type: "error",
			payload: `Already in space ${client.spaceId}`,
		});
		return;
	}

	// Check if space exists
	const spaceRooms = spaces.get(spaceId);
	if (!spaceRooms) {
		client.sendToSelf({
			type: "error",
			payload: `Space ${spaceId} not found`,
		});
		console.warn(
			`Client ${client.id} tried to join space ${spaceId}, but it was not found.`
		);
		return;
	}

	// Join the space
	client.spaceId = spaceId;
	console.log(`Client ${client.id} joined space ${spaceId}`);

	//by default throw him into the first room
	const rooms = getRoomIdsInSpace(spaceId);
	client.roomId = rooms[0] || null;
}

function handleLeaveSpace(client: Client, spaceId: string): void {
	// Check if client is in this space
	if (client.spaceId !== spaceId) {
		client.sendToSelf({
			type: "error",
			payload: `Not in space ${spaceId}`,
		});
		return;
	}

	// If client is in a room, leave it first
	if (client.roomId) {
		handleLeaveRoom(client, client.roomId);
	}

	// Leave the space
	client.spaceId = null;
	client.sendToSelf({
		type: "leftSpace",
		payload: {
			spaceId,
			rooms: [],
		},
	});
	console.log(`Client ${client.id} left space ${spaceId}`);
}

//Change room
function changeroom(client: Client, roomId1: string, roomId2: string) {
	const room1 = findRoom(roomId1);
	const room2 = findRoom(roomId2);
	if (!room1 || !room2) {
		client.sendToSelf({
			type: "error",
			payload: `One or both rooms not found`,
		});
		return;
	}
	handleLeaveRoom(client, roomId1);
	handleJoinRoom(client, { roomId: roomId2 });
}

function handleJoinRoom(client: Client, payload: RoomIdPayload): void {
	const { roomId } = payload;
	if (!client.spaceId) {
		console.warn(
			`Client ${client.id} tried to join room ${roomId} without joining a space first`
		);
		client.sendToSelf({
			type: "error",
			payload: "Must join a space before joining a room",
		});
		return;
	}

	const room = findRoom(roomId);
	if (!room) {
		client.sendToSelf({
			type: "error",
			payload: `Room ${roomId} not found`,
		});
		console.warn(
			`Client ${client.id} tried to join room ${roomId}, but it was not found.`
		);
		return;
	}

	// access check
	const roomSpaceId = getSpaceIdForRoom(roomId);
	if (roomSpaceId !== client.spaceId) {
		client.sendToSelf({
			type: "error",
			payload: `Room ${roomId} is not in your current space`,
		});
		console.warn(
			`Client ${client.id} tried to join room ${roomId} which isn't in their space ${client.spaceId}`
		);
		return;
	}

	//change room logic
	if (client.roomId) {
		const room1 = findRoom(client.roomId);
		const room2 = findRoom(roomId);
		if (room1 && room2) {
			changeroom(client, client.roomId, roomId);
			return;
		}
		console.log("One of the rooms not found");
	}

	//new join logic
	client.roomId = roomId;
	room.addClient(client);

	client.sendToSelf({
		type: "joinedRoom",
		payload: { roomId },
	});
	console.log(`Client ${client.id} joined room ${roomId}`);
}

function handleLeaveRoom(client: Client, roomId: string): void {
	if (client.roomId !== roomId) {
		client.sendToSelf({
			type: "error",
			payload: `Not in room ${roomId}`,
		});
		return;
	}

	const room = findRoom(roomId);

	if (room) {
		room.removeClient(client.id);
		client.roomId = null;
		client.sendToSelf({
			type: "leftRoom",
			payload: { roomId },
		});
		console.log(`Client ${client.id} left room ${roomId}`);
	} else {
		client.sendToSelf({
			type: "error",
			payload: `Room ${roomId} not found`,
		});
		console.warn(
			`Client ${client.id} tried to leave room ${roomId}, but it was not found.`
		);
	}
}

//Can be ignored shitt
//<------------Handling bunch of things gracecfully(basically extra stuff---------------------->

function handleDisconnect(client: Client): void {
	if (!client) return;

	console.log(`Handling disconnect for client: ${client.id}`);

	// Leave room if in one
	if (client.roomId) {
		const room = findRoom(client.roomId);
		if (room) {
			room.removeClient(client.id);
			console.log(`Client ${client.id} removed from room ${client.roomId}`);

			room.broadcastMessage(null, {
				type: "clientLeft",
				payload: { clientId: client.id },
			});

			if (room.isEmpty()) {
				console.log(`Room ${client.roomId} is now empty, removing.`);
				removeRoomFromSpace(client.roomId);
			}
		}
	}

	// Clear space membership
	client.spaceId = null;

	// Ensure WebSocket is closed if not already
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
