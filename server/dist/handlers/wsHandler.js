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
exports.startWebsocketServer = startWebsocketServer;
const ws_1 = require("ws");
const uuid_1 = require("uuid");
const Client_1 = require("../classes/Client");
const authHandler = __importStar(require("../handlers/authHandler"));
const roomHandler = __importStar(require("../handlers/roomHandler"));
const state_1 = require("../state/state");
const setup_1 = require("../mediasoup/setup");
const spaceServices_1 = require("../services/spaceServices");
const mediaHandler_1 = require("./mediaHandler");
function startWebsocketServer(server, path = "/ws") {
    const wss = new ws_1.WebSocketServer({ server, path });
    console.log(`🔌 WebSocket server started on path: ${path}`);
    wss.on("connection", (ws, req) => __awaiter(this, void 0, void 0, function* () {
        const url = req.url || " ";
        const fullUrl = new URL(url, `http://${req.headers.host}`);
        const userId = decodeURI(fullUrl.searchParams.get("userId") || "");
        if (userId.length == 0) {
            console.log("❌ WebSocket connection rejected: No userId provided");
            ws.close(1008, "userId required");
            return;
        }
        //we make a client obj for each user
        const clientid = (0, uuid_1.v4)().toString();
        const client = new Client_1.Client(clientid, userId, ws);
        console.log(`✅ WebSocket connected: userId=${userId}, clientId=${clientid.substr(0, 8)}`);
        ws.on("message", (raw) => __awaiter(this, void 0, void 0, function* () {
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
            }
            catch (_a) {
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
                        payload: setup_1.mediasoupRouter.rtpCapabilities,
                    });
                    break;
                case "createWebRtcTransportSend":
                case "createWebRtcTransportRecv":
                    yield (0, mediaHandler_1.createWebRtcTransport)(client, msg);
                    break;
                case "connectWebRtcTransport":
                    yield (0, mediaHandler_1.connectWebRtcTransport)(client, msg);
                    break;
                case "produceData":
                    // call your existing helper
                    yield (0, mediaHandler_1.produceData)(client, msg);
                    break;
                // ✅ NEW: Handle ICE restart
                case "restartIce":
                    yield (0, mediaHandler_1.restartIce)(client, msg);
                    break;
                case "joinSpace":
                    yield (0, spaceServices_1.joinSpace)(msg.payload.spaceId, userId);
                    break;
                case "joinRoom":
                    res = yield roomHandler.handleJoinRoom(client, msg);
                    client.sendToSelf({
                        type: "JoinedRoom",
                        payload: { clientId: clientid },
                    });
                    break;
                case "leaveRoom":
                    res = yield roomHandler.handleLeaveRoom(client, msg);
                    break;
                case "consumeData":
                    yield (0, mediaHandler_1.consumeData)(client, msg);
                    break;
                case "publicChat":
                    yield roomHandler.handleChatMessage(client, msg);
                    break;
                case "proximityChat":
                    yield roomHandler.handleProximityChat(client, msg);
                    break;
                case "playerMovementUpdate":
                    const { roomId, playerUserId, pos, direction, isMoving } = msg.payload;
                    if (!client.roomId || !pos) {
                        return client.sendToSelf({
                            type: "error",
                            payload: "Invalid movement data or not in room",
                        });
                    }
                    // Update position in room
                    const room = state_1.roomsById.get(client.roomId);
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
                            if (producerUserId === client.userId)
                                return;
                            try {
                                producer.send(JSON.stringify(movementMsg));
                                dataChannelSuccess = true;
                            }
                            catch (error) {
                                console.error(`🚨 Failed to send movement to DataProducer ${producerUserId}:`, error);
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
                    (0, mediaHandler_1.produceMedia)(client, msg);
                    break;
                case "consumeMedia":
                    (0, mediaHandler_1.consumeMedia)(client, msg);
                    break;
            }
        }));
        ws.on("close", () => __awaiter(this, void 0, void 0, function* () {
            console.log(`🔌 WebSocket closed for user: ${client.userId}`);
            yield handleDisconnect(client);
        }));
        ws.on("error", (error) => __awaiter(this, void 0, void 0, function* () {
            console.error(`❌ WebSocket error for client ${client.userId}:`, error);
            yield handleDisconnect(client);
        }));
    }));
    // Log WebSocket server stats periodically
    setInterval(() => {
        console.log(`📊 WebSocket Stats: ${wss.clients.size} connected clients, ${state_1.roomsById.size} active rooms`);
    }, 60000); // Every minute
}
// Update your handleDisconnect function:
function handleDisconnect(client) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log(`🚪 Handling disconnect for client ${client.userId}`);
        if (!client.userId) {
            console.warn("⚠️  Client has no userId, skipping cleanup");
            return;
        }
        if (client.roomId) {
            const room = state_1.roomsById.get(client.roomId);
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
                const producersToDelete = [];
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
                const transportsToDelete = [];
                room.allTransportsById.forEach((transport, transportId) => {
                    var _a;
                    if (((_a = transport.appData) === null || _a === void 0 ? void 0 : _a.clientId) === client.userId) {
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
                    state_1.roomsById.delete(client.roomId);
                    console.log(`🗑️ Room ${client.roomId} deleted (was empty)`);
                }
                else {
                    console.log(`  📊 Room ${client.roomId} now has ${room.clients.size} clients`);
                }
            }
        }
        console.log(`✅ Disconnect handled for ${client.userId}`);
    });
}
