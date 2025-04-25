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
exports.getSpaceIdByRoomId = getSpaceIdByRoomId;
exports.getRoomAssets = getRoomAssets;
const mongodb_1 = require("mongodb");
const db_1 = require("../db");
const RoomModel_1 = require("../Models/RoomModel");
const RoomType_1 = require("../Models/RoomType");
// Get which space a room belongs to
function getSpaceIdByRoomId(roomId) {
    return __awaiter(this, void 0, void 0, function* () {
        const db = yield (0, db_1.getDB)();
        const id = mongodb_1.ObjectId.isValid(roomId) ? new mongodb_1.ObjectId(roomId) : roomId;
        const room = yield db
            .collection(RoomModel_1.ROOMS_COLLECTION)
            .findOne({ id: id }, { projection: { spaceId: 1 } });
        return room ? room.spaceId : null;
    });
}
// Get assets for a room
function getRoomAssets(roomId) {
    return __awaiter(this, void 0, void 0, function* () {
        const db = yield (0, db_1.getDB)();
        const roomid = mongodb_1.ObjectId.isValid(roomId) ? new mongodb_1.ObjectId(roomId) : roomId;
        const room = yield db.collection(RoomModel_1.ROOMS_COLLECTION).findOne({ id: roomid });
        const roomtypeid = room === null || room === void 0 ? void 0 : room.roomTypeId;
        if (!room)
            return [];
        const res = yield db
            .collection(RoomType_1.RoomType_Collection)
            .findOne({ id: roomtypeid });
        const assets = res === null || res === void 0 ? void 0 : res.assets;
        // Fetch the roomType to get its assets
        return assets;
    });
}
