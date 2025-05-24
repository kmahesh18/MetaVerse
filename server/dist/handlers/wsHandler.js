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
        const client = new Client_1.Client(clientid, ws);
        client.userId = userId;
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
                case "joinSpace":
                    yield (0, spaceServices_1.joinSpace)(msg.payload.spaceId, userId);
                    console.log("Joined space succesfully");
                    break;
                case "joinRoom":
                    res = yield roomHandler.handleJoinRoom(client, msg);
                    client.sendToSelf({
                        type: "JoinedRoom",
                        payload: { clientid: clientid }
                    });
                    break;
                case "leaveRoom":
                    res = yield roomHandler.handleLeaveRoom(client, msg);
                    console.log("Left room succesfully", res);
                    break;
            }
        }));
        ws.on("close", () => __awaiter(this, void 0, void 0, function* () {
            yield handleDisconnect(client);
            console.log("Client disconnect succesfully");
        }));
        ws.on("error", (error) => __awaiter(this, void 0, void 0, function* () {
            console.error(`WebSocket error for client ${client.id}:`, error);
            yield handleDisconnect(client);
        }));
    }));
}
// ADD THIS FUNCTION:
function handleDisconnect(client) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log(`Handling disconnect for client ${client.id}`);
        // Remove client from room if they were in one
        if (client.roomId) {
            const room = state_1.roomsById.get(client.roomId);
            if (room) {
                // Remove from clients map
                room.removeClient(client);
                // Close any mediasoup transports for this client
                const transports = Array.from(room.allTransportsById.values()).filter(transport => { var _a; return ((_a = transport.appData) === null || _a === void 0 ? void 0 : _a.clientId) === client.id; });
                transports.forEach(transport => transport.close());
                // Close any data consumers for this client
                const consumers = room.dataConsumers.get(client.id);
                if (consumers) {
                    consumers.forEach(consumer => consumer.close());
                    room.dataConsumers.delete(client.id);
                }
                // Notify other clients that this client left
                room.broadcastMessage(null, {
                    type: "clientLeft",
                    payload: { clientId: client.id }
                });
                console.log(`Client ${client.id} removed from room ${client.roomId}`);
                // Clean up empty room
                if (room.isEmpty()) {
                    state_1.roomsById.delete(client.roomId);
                    console.log(`Room ${client.roomId} deleted (was empty)`);
                }
            }
        }
    });
}
