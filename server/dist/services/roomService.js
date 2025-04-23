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
exports.getRoomById = getRoomById;
exports.isRoomInSpace = isRoomInSpace;
const Room_1 = require("../models/Room");
function getRoomById(id) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            return Room_1.Room.findById(id);
        }
        catch (error) {
            console.error('Error in getRoomById:', error);
            throw error;
        }
    });
}
function isRoomInSpace(roomId, spaceId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const room = yield Room_1.Room.findOne({
                _id: roomId,
                spaceId: spaceId
            });
            return !!room;
        }
        catch (error) {
            console.error('Error in isRoomInSpace:', error);
            throw error;
        }
    });
}
