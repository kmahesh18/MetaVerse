import { Router } from "express";
import { getRoomAssets, getSpaceIdByRoomId, createRoom, getRoomTypeId } from "../services/roomService";
import { ObjectId } from "mongodb"; // Keep if needed for other routes, otherwise remove

export const roomRouter = Router();

// Create a room (Note: Usually rooms are created via space creation)
// This endpoint might be for specific use cases or testing.
roomRouter.post("/", async (req, res) => { 
  try {
    const { roomTypeId, spaceId } = req.body;
    if (!roomTypeId || !spaceId) {
        return res.status(400).json({ message: "Missing roomTypeId or spaceId" });
    }
    const roomId = await createRoom(roomTypeId, spaceId);
    // Return the ID of the created room
    res.status(201).json({ id: roomId }); 
  } catch (error: any) {
    console.error("POST /api/rooms - Error:", error.message);
    res.status(500).json({ message: error.message || "Error creating room" });
  }
});

// Get room details (including assets and type)
roomRouter.get("/:roomId", async (req, res) => {
  try {
    const { roomId } = req.params;
    
    // Fetch details in parallel
    const [assets, spaceId, roomTypeId] = await Promise.all([
        getRoomAssets(roomId),
        getSpaceIdByRoomId(roomId),
        getRoomTypeId(roomId)
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

  } catch (err: any) {
    console.error(`GET /api/rooms/${req.params.roomId} - Error:`, err.message);
    res.status(500).json({ error: err.message || "Error retrieving room details" });
  }
});


roomRouter.get("/:id/space", async (req, res) => { // Changed path slightly to avoid conflict
  try {
    const { id } = req.params;
    const spaceId = await getSpaceIdByRoomId(id);
    if (!spaceId) {
      return res.status(404).json({ error: "Room not found or space association missing" });
    }
    res.json({ spaceId: spaceId }); 

  } catch (err: any) {
    console.error(`GET /api/rooms/${req.params.id}/space - Error:`, err.message);
    res.status(500).json({ error: err.message || "Error retrieving space for room" });
  }
});

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