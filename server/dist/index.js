"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = require("ws");
const uuid_1 = require("uuid");
const mediasoup = __importStar(require("mediasoup"));
const companyService_1 = require("./services/companyService");
const spaceService_1 = require("./services/spaceService");
const membershipService_1 = require("./services/membershipService");
const userService_1 = require("./services/userService"); // Add this import
const roomService_1 = require("./services/roomService"); // Add this
let mediasoupWorker;
let mediasoupRouter;
//function to setup mediasoup
function createMediasoupWorker() {
    return __awaiter(this, void 0, void 0, function* () {
        mediasoupWorker = yield mediasoup.createWorker();
        mediasoupRouter = yield mediasoupWorker.createRouter({
            mediaCodecs: [],
        });
        console.log("mediasoupWorker and router started");
    });
}
createMediasoupWorker();
const PORT = Number(process.env.PORT) || 8080;
const wss = new ws_1.WebSocketServer({ port: PORT });
console.log(`WebSocket server is running on ws://localhost:${PORT}`);
// Keep only this for mediasoup state
const roomsById = new Map();
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
// Room related class
class Room {
    constructor(roomId) {
        this.id = roomId;
        this.clients = new Map();
        this.mediasoupTransports = new Map();
        this.dataProducers = new Map();
        this.dataConsumers = new Map();
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
// Helper: load or create the mediasoup Room stub
function getOrCreateRoom(roomId) {
    let r = roomsById.get(roomId);
    if (!r) {
        r = new Room(roomId);
        roomsById.set(roomId, r);
    }
    return r;
}
// WebSocket connection handling stuff
wss.on("connection", (ws) => __awaiter(void 0, void 0, void 0, function* () {
    const id = (0, uuid_1.v4)();
    const client = new Client(id, ws);
    console.log(`New client connected: ${id}`);
    // Create a temporary user for this connection
    try {
        yield (0, userService_1.createUser)({
            id, // Use the client ID as the user ID
            account: `temp-${id.substring(0, 8)}`,
            name: `Visitor-${id.substring(0, 5)}`,
            email: `temp-${id.substring(0, 8)}@example.com`,
            password: "temporary",
        });
        console.log(`Temporary user created for client: ${id}`);
    }
    catch (error) {
        console.error(`Failed to create temporary user: ${error}`);
    }
    ws.on("message", (data) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            // Parse the incoming message
            const message = JSON.parse(data.toString());
            console.log(`Received message from ${id}:`, message.type);
            yield handleMessage(client, message);
        }
        catch (error) {
            console.log(`Error handling message from ${id}:`, error);
            client.sendToSelf({
                type: "error",
                payload: "Invalid message format",
            });
        }
    }));
    ws.on("close", () => {
        console.log(`Client connection closed: ${id}`);
        handleDisconnect(client);
    });
    ws.on("error", (err) => {
        console.error(`WebSocket error for client ${id}:`, err);
    });
}));
// Handle incoming messages from clients
function handleMessage(client, message) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
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
                case "createCompany": {
                    const { name, description } = message.payload;
                    if (typeof name !== "string" || !name) {
                        return client.sendToSelf({
                            type: "error",
                            payload: "Company name required",
                        });
                    }
                    const company = yield (0, companyService_1.createCompany)(name);
                    client.sendToSelf({
                        type: "companyCreated",
                        payload: { companyId: company.id },
                    });
                    break;
                }
                case "createSpace": {
                    const { companyId, name, numRooms = 1 } = message.payload;
                    if (typeof companyId !== "string") {
                        return client.sendToSelf({
                            type: "error",
                            payload: "companyId missing",
                        });
                    }
                    const space = yield (0, spaceService_1.createSpace)(companyId, name || `Space-${Date.now()}`, numRooms);
                    // Get rooms from the space object returned by the service
                    const roomIds = ((_a = space === null || space === void 0 ? void 0 : space.rooms) === null || _a === void 0 ? void 0 : _a.map((r) => r.id)) || [];
                    client.sendToSelf({
                        type: "spaceCreated",
                        payload: {
                            spaceId: space.id,
                            rooms: roomIds,
                        },
                    });
                    break;
                }
                case "joinSpace": {
                    const { spaceId } = message.payload;
                    const space = yield (0, spaceService_1.getSpaceById)(spaceId, { include: { rooms: true } });
                    if (!space) {
                        return client.sendToSelf({
                            type: "error",
                            payload: `Space ${spaceId} not found`,
                        });
                    }
                    yield (0, membershipService_1.addUserToSpace)(client.id, spaceId);
                    client.spaceId = spaceId;
                    client.sendToSelf({
                        type: "joinedSpace", // CHANGE FROM "joinSpace" to match SpaceResponseMessage
                        payload: {
                            spaceId,
                            rooms: space.rooms.map((r) => r.id),
                        },
                    });
                    break;
                }
                case "leaveSpace": {
                    const { spaceId } = message.payload;
                    if (client.spaceId !== spaceId) {
                        return client.sendToSelf({
                            type: "error",
                            payload: `Not in space ${spaceId}`,
                        });
                    }
                    // If in a room, leave that first
                    if (client.roomId) {
                        const msRoom = roomsById.get(client.roomId);
                        if (msRoom) {
                            msRoom.removeClient(client.id);
                        }
                        yield (0, membershipService_1.removeUserFromRoom)(client.id);
                        client.roomId = null;
                    }
                    yield (0, membershipService_1.removeUserFromSpace)(client.id);
                    client.spaceId = null;
                    client.sendToSelf({
                        type: "leftSpace", // CHANGE FROM "leaveSpace" to match SpaceResponseMessage
                        payload: { spaceId, rooms: [] },
                    });
                    break;
                }
                case "joinRoom": {
                    const { roomId } = message.payload;
                    if (!client.spaceId) {
                        return client.sendToSelf({
                            type: "error",
                            payload: "Must join a space before joining a room",
                        });
                    }
                    const roomBelongsToSpace = yield (0, roomService_1.isRoomInSpace)(roomId, client.spaceId);
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
                    yield (0, membershipService_1.addUserToRoom)(client.id, roomId);
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
                    yield (0, membershipService_1.removeUserFromRoom)(client.id);
                    client.roomId = null;
                    const msRoom = roomsById.get(roomId);
                    if (msRoom) {
                        msRoom.removeClient(client.id);
                        client.sendToSelf({
                            type: "leftRoom",
                            payload: { roomId },
                        });
                    }
                    else {
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
                    const transport = yield mediasoupRouter.createWebRtcTransport({
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
                    const transport = msRoom === null || msRoom === void 0 ? void 0 : msRoom.mediasoupTransports.get(transportId);
                    if (transport) {
                        yield transport.connect({ dtlsParameters });
                        client.sendToSelf({
                            type: "webRtcTransportConnected",
                            payload: { transportId },
                        });
                    }
                    else {
                        client.sendToSelf({
                            type: "error",
                            payload: "Transport not found",
                        });
                    }
                    break;
                }
                case "produceData": {
                    const { transportId, sctpStreamParameters, label, protocol } = message.payload;
                    if (!client.roomId) {
                        return client.sendToSelf({
                            type: "error",
                            payload: "Must join a room first",
                        });
                    }
                    const msRoom = roomsById.get(client.roomId);
                    const transport = msRoom === null || msRoom === void 0 ? void 0 : msRoom.mediasoupTransports.get(transportId);
                    if (!transport) {
                        return client.sendToSelf({
                            type: "error",
                            payload: "Transport not found",
                        });
                    }
                    const dataProducer = yield transport.produceData({
                        sctpStreamParameters,
                        label,
                        protocol,
                    });
                    msRoom.dataProducers.set(dataProducer.id, dataProducer);
                    client.sendToSelf({
                        type: "dataProduced",
                        payload: {
                            dataProducerId: dataProducer.id,
                        },
                    });
                    //tell others there's a new msg producer
                    msRoom.broadcastMessage(client.id, {
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
                    const consumer = yield transport.consumeData({
                        dataProducerId: producerId,
                    });
                    if (!msRoom.dataConsumers.get(client.id)) {
                        msRoom.dataConsumers.set(client.id, []);
                    }
                    msRoom.dataConsumers.get(client.id).push(consumer);
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
        }
        catch (error) {
            console.error(`Error handling ${message.type}:`, error);
            client.sendToSelf({
                type: "error",
                payload: `Error processing ${message.type}: ${error.message}`,
            });
        }
    });
}
function handleDisconnect(client) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!client)
            return;
        console.log(`Handling disconnect for client: ${client.id}`);
        // Update DB first
        if (client.roomId) {
            yield (0, membershipService_1.removeUserFromRoom)(client.id);
            // Clean up mediasoup
            const msRoom = roomsById.get(client.roomId);
            if (msRoom) {
                msRoom.removeClient(client.id);
            }
        }
        if (client.spaceId) {
            yield (0, membershipService_1.removeUserFromSpace)(client.id);
        }
        // Close socket if needed
        if (client.ws.readyState !== ws_1.WebSocket.CLOSED &&
            client.ws.readyState !== ws_1.WebSocket.CLOSING) {
            client.ws.terminate();
        }
    });
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
