"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrCreateRoom = getOrCreateRoom;
exports.handleJoinRoom = handleJoinRoom;
exports.handleLeaveRoom = handleLeaveRoom;
exports.playerMovementUpdate = playerMovementUpdate;
exports.handleChatMessage = handleChatMessage;
exports.handleProximityChat = handleProximityChat;
const userService_1 = require("../services/userService");
const userService_2 = require("../services/userService");
const userService_3 = require("../services/userService");
const state_1 = require("../state/state");
const Room_1 = __importDefault(require("../classes/Room"));
function getOrCreateRoom(roomId) {
    let r = state_1.roomsById.get(roomId);
    if (!r) {
        r = new Room_1.default(roomId);
        state_1.roomsById.set(roomId, r);
    }
    return r;
}
function cleanupRoom(roomId) {
    const room = state_1.roomsById.get(roomId);
    if (room && room.isEmpty()) {
        state_1.roomsById.delete(roomId);
        console.log(`Room ${roomId} deleted (was empty)`);
    }
}
function handleJoinRoom(client, message) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!client.userId)
            return;
        const { roomId } = message.payload;
        // Handle room change if already in a room
        if (client.roomId) {
            const oldRoom = state_1.roomsById.get(client.roomId);
            if (oldRoom) {
                oldRoom.removeClient(client);
                oldRoom.dataProducers.forEach((producer, producerId) => {
                    var _a;
                    if (((_a = producer.appData) === null || _a === void 0 ? void 0 : _a.clientId) === client.userId) {
                        producer.close();
                        oldRoom.dataProducers.delete(producerId);
                        console.log(`Cleaned up old DataProducer ${producerId} for client ${client.userId}`);
                    }
                });
            }
        }
        // Join the new room
        yield (0, userService_1.JoinRoom)(client, roomId);
        const msRoom = getOrCreateRoom(roomId);
        if (!msRoom.clients.has(client.userId)) {
            msRoom.addClient(client);
        }
        msRoom.dataConsumers.set(client.userId, []);
        client.sendToSelf({
            type: "JoinedRoom",
            payload: {
                roomId,
                clientId: client.userId,
            },
        });
        // }, 2000);
        return roomId;
    });
}
function handleLeaveRoom(client, message) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!client.userId)
            return;
        const { roomId } = message.payload;
        if (client.roomId !== roomId) {
            return client.sendToSelf({
                type: "error",
                payload: `Not in room ${roomId}`,
            });
        }
        yield (0, userService_2.LeaveRoom)(client, roomId); // Use client.userId
        client.roomId = null;
        const msRoom = state_1.roomsById.get(roomId);
        if (msRoom) {
            msRoom.removeClient(client);
            cleanupRoom(roomId);
            msRoom.broadcastMessage(client.userId, {
                type: "leftRoom",
                payload: { roomId: roomId, userId: client.userId },
            });
        }
        else {
            client.sendToSelf({
                type: "error",
                payload: `Room ${roomId} not found`,
            });
        }
    });
}
function playerMovementUpdate(roomId, clientId, pos) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (!roomId || !clientId || !pos)
                return false;
            const room = getOrCreateRoom(roomId);
            if (!room)
                return false;
            room.playerPositions.set(clientId, pos);
            console.log(room.playerPositions);
            return true;
        }
        catch (error) {
            console.log("error occured at playerMovementUpdate", error);
            return false;
        }
    });
}
function handleChatMessage(client, message) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!client.userId || !client.roomId) {
            return client.sendToSelf({
                type: "error",
                payload: "You must be in a room to send messages",
            });
        }
        const { text } = message.payload;
        if (!text || typeof text !== "string" || text.trim() === "") {
            return client.sendToSelf({
                type: "error",
                payload: "Message cannot be empty",
            });
        }
        const room = state_1.roomsById.get(client.roomId);
        if (!room) {
            return client.sendToSelf({
                type: "error",
                payload: "Room not found",
            });
        }
        // Get sender name with error handling
        let senderName;
        try {
            senderName = yield (0, userService_3.getNameByClerkId)(client.userId);
        }
        catch (error) {
            console.error(`Error getting name for user ${client.userId}:`, error);
            senderName = "bot"; // Fallback name
        }
        // Broadcast the message to all clients in the room
        room.broadcastMessage(null, {
            type: "publicChat",
            payload: {
                senderId: client.userId,
                senderName: senderName || "bot", // Ensure we have a string value
                message: text,
                timestamp: Date.now(),
            },
        });
    });
}
function handleProximityChat(client, message) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!client.userId || !client.roomId) {
            return client.sendToSelf({
                type: "error",
                payload: "You must be in a room to send proximity messages",
            });
        }
        const { text, chatRadius = 150 } = message.payload; // Default radius of 150 pixels
        if (!text || typeof text !== "string" || text.trim() === "") {
            return client.sendToSelf({
                type: "error",
                payload: "Message cannot be empty",
            });
        }
        const room = state_1.roomsById.get(client.roomId);
        if (!room) {
            return client.sendToSelf({
                type: "error",
                payload: "Room not found",
            });
        }
        // Get sender's position
        const senderPos = room.playerPositions.get(client.userId);
        if (!senderPos) {
            return client.sendToSelf({
                type: "error",
                payload: "Your position not found",
            });
        }
        // Get sender name
        let senderName;
        try {
            senderName = yield (0, userService_3.getNameByClerkId)(client.userId);
        }
        catch (error) {
            console.error(`Error getting name for user ${client.userId}:`, error);
            senderName = "bot";
        }
        // Find clients within proximity radius
        const nearbyClients = [];
        room.clients.forEach((otherClient, otherClientId) => {
            if (otherClientId === client.userId)
                return; // Skip sender
            const otherPos = room.playerPositions.get(otherClientId);
            if (!otherPos)
                return;
            // Calculate distance between players
            const distance = Math.sqrt(Math.pow(senderPos.posX - otherPos.posX, 2) +
                Math.pow(senderPos.posY - otherPos.posY, 2));
            if (distance <= chatRadius) {
                nearbyClients.push(otherClientId);
            }
        });
        // Send message to nearby clients (including sender for confirmation)
        const chatMessage = {
            type: "proximityChat",
            payload: {
                senderId: client.userId,
                senderName: senderName || "bot",
                message: text,
                timestamp: Date.now(),
                chatRadius,
                senderPosition: senderPos,
            },
        };
        // Send to sender (for confirmation)
        client.sendToSelf(chatMessage);
        // Send to nearby clients
        nearbyClients.forEach((clientId) => {
            const targetClient = room.getClient(clientId);
            if (targetClient) {
                targetClient.sendToSelf(chatMessage);
            }
        });
        client.sendToSelf({
            type: "proximityChatInfo",
            payload: {
                recipientCount: nearbyClients.length,
                radius: chatRadius,
            },
        });
    });
}
