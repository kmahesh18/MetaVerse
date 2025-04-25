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
exports.roomRouter = void 0;
const express_1 = require("express");
const roomService_1 = require("../services/roomService");
const mongodb_1 = require("mongodb");
exports.roomRouter = (0, express_1.Router)();
// Get all avatars
exports.roomRouter.get("/:roomId", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { roomId } = req.params;
        const roomAssets = yield (0, roomService_1.getRoomAssets)(roomId);
        res.json(roomAssets);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
}));
// Get avatar by ID
exports.roomRouter.get("/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        if (!mongodb_1.ObjectId.isValid(id)) {
            return res.status(400).json({ error: "Invalid avatar ID format" });
        }
        const space = yield (0, roomService_1.getSpaceIdByRoomId)(id);
        if (!space) {
            return res.status(404).json({ error: "Avatar not found" });
        }
        res.json(space);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
}));
