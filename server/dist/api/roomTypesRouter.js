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
exports.roomTypesRouter = void 0;
const express_1 = require("express");
const roomTypeService_1 = require("../services/roomTypeService");
exports.roomTypesRouter = (0, express_1.Router)();
// Get all room types
exports.roomTypesRouter.get("/", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log("Fetching room types...");
        const roomTypes = yield (0, roomTypeService_1.getAllRoomTypes)();
        console.log(`Successfully retrieved ${roomTypes.length} room types`);
        if (!roomTypes || roomTypes.length === 0) {
            console.log("No room types found, returning empty array");
            return res.json([]);
        }
        res.json(roomTypes);
    }
    catch (error) {
        console.error("GET /api/roomtypes - Error:", error.message);
        res.status(500).json({ message: error.message || "Error fetching room types" });
    }
}));
