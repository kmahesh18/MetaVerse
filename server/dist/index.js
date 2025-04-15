"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = require("ws");
const uuid_1 = require("uuid");
//-----------------------------------SERVER SHITT-----------------------------------//
const PORT = Number(process.env.PORT) || 8080;
const wss = new ws_1.WebSocketServer({ port: PORT });
console.log(`WebSocket server is running on ws://localhost:${PORT}`);
const spaces = new Map();
const roomIndex = new Map();
class Client {
    constructor(id, ws) {
        this.id = id;
        this.ws = ws;
        this.roomId = null;
        this.spaceId = null;
    }
    sendToSelf(message) {
        if (this.ws.readyState === ws_1.WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        }
    }
}
function createSpace(numRooms) {
    if (numRooms <= 0) {
        console.error("Number of rooms must be greater than zero");
        return "";
    }
    const spaceId = (0, uuid_1.v4)();
    const spaceRooms = [];
    for (let i = 0; i < numRooms; i++) {
        const roomId = (0, uuid_1.v4)();
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
function findRoom(roomId) {
    var _a;
    return (_a = roomIndex.get(roomId)) === null || _a === void 0 ? void 0 : _a.room;
}
// get spaceId for a room
function getSpaceIdForRoom(roomId) {
    var _a;
    return (_a = roomIndex.get(roomId)) === null || _a === void 0 ? void 0 : _a.spaceId;
}
// get all room IDs in a space
function getRoomIdsInSpace(spaceId) {
    const spaceRooms = spaces.get(spaceId);
    if (!spaceRooms)
        return [];
    return spaceRooms.map((room) => room.id);
}
// remove a room from a space
function removeRoomFromSpace(roomId) {
    const roomInfo = roomIndex.get(roomId);
    if (roomInfo) {
        const { spaceId } = roomInfo;
        const spaceRooms = spaces.get(spaceId);
        if (spaceRooms) {
            const newRooms = spaceRooms.filter((room) => room.id !== roomId);
            if (newRooms.length === 0) {
                spaces.delete(spaceId);
                console.log(`Space ${spaceId} is now empty, removing.`);
            }
            else {
                // remaining rooms
                spaces.set(spaceId, newRooms);
            }
        }
        roomIndex.delete(roomId);
    }
}
// Room related shitt
class Room {
    constructor(roomId) {
        this.id = roomId;
        this.clients = new Map();
    }
    addClient(client) {
        this.clients.set(client.id, client);
        console.log(`Client ${client.id} added to room ${this.id}`);
    }
    removeClient(clientId) {
        const client = this.clients.get(clientId);
        if (client) {
            this.clients.delete(clientId);
            console.log(`Client ${clientId} removed from room ${this.id}`);
            return true;
        }
        return false;
    }
    getClient(clientId) {
        return this.clients.get(clientId);
    }
    broadcastMessage(senderId, message) {
        const messageString = JSON.stringify(message);
        this.clients.forEach((client) => {
            if ((senderId === null || client.id !== senderId) &&
                client.ws.readyState === ws_1.WebSocket.OPEN) {
                client.ws.send(messageString);
            }
        });
    }
    sendToClient(clientId, message) {
        const client = this.clients.get(clientId);
        if (client && client.ws.readyState === ws_1.WebSocket.OPEN) {
            client.ws.send(JSON.stringify(message));
        }
    }
    isEmpty() {
        return this.clients.size === 0;
    }
}
// WebSocket connection handling stuff
wss.on("connection", (ws) => {
    const id = (0, uuid_1.v4)();
    const client = new Client(id, ws);
    console.log(`New client connected: ${id}`);
    ws.on("message", (data) => {
        try {
            // Parse the incoming message
            const message = JSON.parse(data.toString());
            console.log(`Received message from ${id}:`, message.type);
            handleMessage(client, message);
        }
        catch (error) {
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
function handleMessage(client, message) {
    var _a;
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
            const numRooms = ((_a = message.payload) === null || _a === void 0 ? void 0 : _a.numRooms) || 1;
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
function handleJoinSpace(client, payload) {
    const { spaceId } = payload;
    if (client.spaceId) {
        console.warn(`Client ${client.id} tried to join space ${spaceId} but is already in space ${client.spaceId}`);
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
        console.warn(`Client ${client.id} tried to join space ${spaceId}, but it was not found.`);
        return;
    }
    // Join the space
    client.spaceId = spaceId;
    console.log(`Client ${client.id} joined space ${spaceId}`);
    //by default throw him into the first room
    const rooms = getRoomIdsInSpace(spaceId);
    client.roomId = rooms[0] || null;
}
function handleLeaveSpace(client, spaceId) {
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
function changeroom(client, roomId1, roomId2) {
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
function handleJoinRoom(client, payload) {
    const { roomId } = payload;
    if (!client.spaceId) {
        console.warn(`Client ${client.id} tried to join room ${roomId} without joining a space first`);
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
        console.warn(`Client ${client.id} tried to join room ${roomId}, but it was not found.`);
        return;
    }
    // access check
    const roomSpaceId = getSpaceIdForRoom(roomId);
    if (roomSpaceId !== client.spaceId) {
        client.sendToSelf({
            type: "error",
            payload: `Room ${roomId} is not in your current space`,
        });
        console.warn(`Client ${client.id} tried to join room ${roomId} which isn't in their space ${client.spaceId}`);
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
function handleLeaveRoom(client, roomId) {
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
    }
    else {
        client.sendToSelf({
            type: "error",
            payload: `Room ${roomId} not found`,
        });
        console.warn(`Client ${client.id} tried to leave room ${roomId}, but it was not found.`);
    }
}
//Can be ignored shitt
//<------------Handling bunch of things gracecfully(basically extra stuff---------------------->
function handleDisconnect(client) {
    if (!client)
        return;
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
    if (client.ws.readyState !== ws_1.WebSocket.CLOSED &&
        client.ws.readyState !== ws_1.WebSocket.CLOSING) {
        client.ws.terminate();
    }
}
// Type guards
function isValidRoomPayload(payload) {
    return (typeof payload === "object" &&
        payload !== null &&
        typeof payload.roomId === "string");
}
function isValidSpacePayload(payload) {
    return (typeof payload === "object" &&
        payload !== null &&
        typeof payload.spaceId === "string");
}
