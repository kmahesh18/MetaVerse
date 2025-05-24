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
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRoom = createRoom;
exports.getSpaceIdByRoomId = getSpaceIdByRoomId;
exports.getRoomAssets = getRoomAssets;
exports.getRoomTypeId = getRoomTypeId;
exports.getRoomPlayersAvatars = getRoomPlayersAvatars;
const uuid_1 = require("uuid");
const db_1 = require("../db");
const RoomModel_1 = require("../Models/RoomModel");
const RoomType_1 = require("../Models/RoomType");
const AssetModel_1 = require("../Models/AssetModel");
const roomHandler_1 = require("../handlers/roomHandler");
const UserModel_1 = require("../Models/UserModel");
// Create Room
function createRoom(roomTypeId, spaceId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const db = yield (0, db_1.getDB)();
            const id = (0, uuid_1.v4)();
            const createdAt = new Date();
            const roomData = {
                id,
                spaceId,
                roomTypeId,
                createdAt,
            };
            const insertResult = yield db.collection(RoomModel_1.ROOMS_COLLECTION).insertOne(roomData);
            if (!insertResult.insertedId) {
                throw new Error("DB insertion failed: No insertedId returned.");
            }
            console.log(`Room ${id} (type: ${roomTypeId}) created successfully for space ${spaceId}`);
            return id;
        }
        catch (error) {
            console.error(`Error creating room (type: ${roomTypeId}, space: ${spaceId}):`, error);
            throw new Error(`Failed to create room: ${error.message}`); // Re-throw simplified error
        }
    });
}
// Get which space a room belongs to
function getSpaceIdByRoomId(roomId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const db = yield (0, db_1.getDB)();
            const room = yield db
                .collection(RoomModel_1.ROOMS_COLLECTION)
                .findOne({ id: roomId }, { projection: { spaceId: 1 } });
            return (room === null || room === void 0 ? void 0 : room.spaceId) || null;
        }
        catch (error) {
            console.error(`Error fetching spaceId for room ${roomId}:`, error);
            throw error; // Re-throw original error
        }
    });
}
// Get assets for a room based on its type
function getRoomAssets(roomId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const db = yield (0, db_1.getDB)();
            const room = yield db.collection(RoomModel_1.ROOMS_COLLECTION).findOne({ id: roomId }, { projection: { roomTypeId: 1 } });
            if (!(room === null || room === void 0 ? void 0 : room.roomTypeId)) {
                console.warn(`Room ${roomId} not found or has no roomTypeId.`);
                return [];
            }
            const roomType = yield db
                .collection(RoomType_1.RoomType_Collection)
                .findOne({ id: room.roomTypeId }, { projection: { assets: 1 } });
            return (roomType === null || roomType === void 0 ? void 0 : roomType.assets) || [];
        }
        catch (error) {
            console.error(`Error fetching assets for room ${roomId}:`, error);
            throw error; // Re-throw original error
        }
    });
}
// Get room type ID for a room
function getRoomTypeId(roomId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const db = yield (0, db_1.getDB)();
            const room = yield db.collection(RoomModel_1.ROOMS_COLLECTION).findOne({ id: roomId });
            return (room === null || room === void 0 ? void 0 : room.roomTypeId) || null;
        }
        catch (error) {
            console.log("Error in getRoomTypeId:", error);
            throw error;
        }
    });
}
function getRoomPlayersAvatars(roomId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const db = yield (0, db_1.getDB)();
            const room = (0, roomHandler_1.getOrCreateRoom)(roomId);
            const clients = room.clients;
            const clientAvatars = new Map();
            clients.forEach((client) => __awaiter(this, void 0, void 0, function* () {
                const userId = client.userId;
                console.log("userId", userId);
                const user = yield db.collection(UserModel_1.USERS_COLLECTION).findOne({ id: userId });
                console.log("user", user);
                const avatarId = user === null || user === void 0 ? void 0 : user.avatarId;
                const avatar = yield db.collection(AssetModel_1.ASSET_COLLECTION).findOne({ id: avatarId });
                console.log("avatar", avatarId);
                clientAvatars.set(client.id, avatar === null || avatar === void 0 ? void 0 : avatar.previewUrl);
            }));
            console.log("Client Avatars previewUrl", clientAvatars);
            return clientAvatars;
        }
        catch (error) {
            console.log("error occured in room ssevices while getting room Players avatars");
        }
    });
}
