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
exports.getAllRoomTypes = getAllRoomTypes;
const db_1 = require("../db");
const RoomType_1 = require("../Models/RoomType");
// Fetch all room types
function getAllRoomTypes() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const db = yield (0, db_1.getDB)();
            const roomTypes = yield db.collection(RoomType_1.RoomType_Collection).find({}).toArray();
            console.log("Room types retrieved successfully:", roomTypes);
            return roomTypes;
        }
        catch (error) {
            console.error("Error fetching room types:", error);
            throw new Error(`Failed to fetch room types: ${error}`);
        }
    });
}
