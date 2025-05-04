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
exports.roomRouter = (0, express_1.Router)();
// Create a room (Note: Usually rooms are created via space creation)
// This endpoint might be for specific use cases or testing.
exports.roomRouter.post("/", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { roomTypeId, spaceId } = req.body;
        if (!roomTypeId || !spaceId) {
            return res.status(400).json({ message: "Missing roomTypeId or spaceId" });
        }
        const roomId = yield (0, roomService_1.createRoom)(roomTypeId, spaceId);
        // Return the ID of the created room
        res.status(201).json({ id: roomId });
    }
    catch (error) {
        console.error("POST /api/rooms - Error:", error.message);
        res.status(500).json({ message: error.message || "Error creating room" });
    }
}));
// Get room details (including assets and type)
exports.roomRouter.get("/:roomId", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { roomId } = req.params;
        // Fetch details in parallel
        const [assets, spaceId, roomTypeId] = yield Promise.all([
            (0, roomService_1.getRoomAssets)(roomId),
            (0, roomService_1.getSpaceIdByRoomId)(roomId),
            (0, roomService_1.getRoomTypeId)(roomId)
        ]);
        // Check if the room exists (e.g., by checking if spaceId was found)
        if (!spaceId || !roomTypeId) {
            return res.status(404).json({ message: "Room not found" });
        }
        res.json({
            id: roomId,
            spaceId: spaceId,
            roomTypeId: roomTypeId,
            assets: assets
        });
    }
    catch (err) {
        console.error(`GET /api/rooms/${req.params.roomId} - Error:`, err.message);
        res.status(500).json({ error: err.message || "Error retrieving room details" });
    }
}));
// --- Deprecated/Redundant Routes? ---
// Get space by roomID (Redundant: GET /:roomId now includes spaceId)
/*
roomRouter.get("/:id/space", async (req, res) => { // Changed path slightly to avoid conflict
  try {
    const { id } = req.params;

    // Basic ID format check (optional, depending on ID format)
    // if (!ObjectId.isValid(id)) {
    //   return res.status(400).json({ error: "Invalid room ID format" });
    // }

    const spaceId = await getSpaceIdByRoomId(id);

    if (!spaceId) {
      return res.status404).json({ error: "Room not found or space association missing" });
    }

    // Consider fetching full space details if needed, or just return the ID
    res.json({ spaceId: spaceId });

  } catch (err: any) {
    console.error(`GET /api/rooms/${req.params.id}/space - Error:`, err.message);
    res.status(500).json({ error: err.message || "Error retrieving space for room" });
  }
});
*/
// Get all assets of a room (Redundant: GET /:roomId now includes assets)
/*
roomRouter.get("/:roomId/assets", async (req, res) => { // Changed path slightly
  try {
    const { roomId } = req.params;
    const roomAssets = await getRoomAssets(roomId);
    // getRoomAssets handles not found case by returning []
    res.json(roomAssets);
  } catch (err: any) {
    console.error(`GET /api/rooms/${req.params.roomId}/assets - Error:`, err.message);
    res.status(500).json({ error: err.message || "Error retrieving room assets" });
  }
});
*/
