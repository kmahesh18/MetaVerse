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
const userService_1 = require("../services/userService");
const userService_2 = require("../services/userService");
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
function handleJoinRoom(client, message) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!client.userId)
            return; // Should not happen if isAuthenticated is true
        const { roomId } = message.payload;
        if (!client.spaceId) {
            return client.sendToSelf({
                type: "error",
                payload: "Must join a space before joining a room",
            });
        }
        // Handle room change if already in a room
        if (client.roomId) {
            const oldRoom = state_1.roomsById.get(client.roomId);
            if (oldRoom) {
                oldRoom.removeClient(client.id);
            }
        }
        // Join the new room using the authenticated userId
        yield (0, userService_1.JoinRoom)(client.userId, roomId); // Use client.userId
        client.roomId = roomId;
        // Get or create mediasoup room
        const msRoom = getOrCreateRoom(roomId);
        msRoom.addClient(client);
        msRoom.dataConsumers.set(client.id, []);
        client.sendToSelf({
            type: "joinedRoom", // CHANGE FROM "joinRoom" to match RoomResponseMessage
            payload: { roomId },
        });
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
        yield (0, userService_2.LeaveRoom)(client.userId); // Use client.userId
        client.roomId = null;
        const msRoom = state_1.roomsById.get(roomId);
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
    });
}
