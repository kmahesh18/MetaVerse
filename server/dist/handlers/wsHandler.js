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
    wss.on("connection", (ws, req) => __awaiter(this, void 0, void 0, function* () {
        const url = req.url || " ";
        const fullUrl = new URL(url, `http://${req.headers.host}`);
        const userId = decodeURI(fullUrl.searchParams.get("userId") || "");
        if (userId.length == 0) {
            console.log("NO userid found check again");
            return;
        }
        //we make a client obj for each user
        const clientid = (0, uuid_1.v4)().toString();
        const client = new Client_1.Client(clientid, userId, ws);
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
                    if (room) {
                        if (!client.userId) {
                            console.log("error at player moment update");
                            return;
                        }
                        room.playerPositions.set(client.userId, pos);
                        room.dataProducers.forEach((producer, producerId) => {
                            // Find which client owns this producer
                            const ownerClient = Array.from(room.clients.values()).find((c) => {
                                // You might need to track which client owns which producer
                                return true; // For now, broadcast to all
                            });
                            if (ownerClient && ownerClient.userId !== client.userId) {
                                try {
                                    producer.send(JSON.stringify({
                                        type: "playerMovementUpdate",
                                        payload: {
                                            isMoving: isMoving,
                                            playerUserId: playerUserId,
                                            pos: pos,
                                            direction: direction,
                                            timestamp: Date.now(),
                                        },
                                    }));
                                }
                                catch (error) {
                                    console.log("Error broadcasting via DataProducer:", error);
                                }
                            }
                        });
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
            yield handleDisconnect(client);
            console.log("Client disconnect succesfully");
        }));
        ws.on("error", (error) => __awaiter(this, void 0, void 0, function* () {
            console.error(`WebSocket error for client ${client.userId}:`, error);
            yield handleDisconnect(client);
        }));
    }));
}
// Update your handleDisconnect function:
function handleDisconnect(client) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        console.log(`Handling disconnect for client ${client.userId}`);
        if (client.roomId) {
            const room = state_1.roomsById.get(client.roomId);
            if (room) {
                // ✅ CLEAN UP: Close and remove client's DataProducer
                room.broadcastMessage(null, {
                    type: "clientLeft",
                    payload: { clientId: client.userId },
                });
                room.dataProducers.forEach((producer, producerId) => {
                    var _a;
                    if (((_a = producer.appData) === null || _a === void 0 ? void 0 : _a.clientId) === client.userId) {
                        producer.close();
                        room.dataProducers.delete(producerId);
                        console.log(`Cleaned up DataProducer ${producerId} for disconnected client ${client.userId}`);
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
                const transports = Array.from(room.allTransportsById.values()).filter((transport) => { var _a; return ((_a = transport.appData) === null || _a === void 0 ? void 0 : _a.clientId) === client.userId; });
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
                (_a = room.mediaProducers) === null || _a === void 0 ? void 0 : _a.forEach((producer, producerId) => {
                    var _a;
                    if (((_a = producer.appData) === null || _a === void 0 ? void 0 : _a.clientId) === client.userId) {
                        producer.close();
                        room.mediaProducers.delete(producerId);
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
                    state_1.roomsById.delete(client.roomId);
                    console.log(`Room ${client.roomId} deleted (was empty)`);
                }
            }
        }
    });
}
