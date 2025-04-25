import { Router } from "express";
import { getRoomAssets, getSpaceIdByRoomId } from "../services/roomService";
import { ObjectId } from "mongodb";
import { v4 } from "uuid";
export const roomRouter = Router();
import { getDB } from "../db";
import { createRoom } from "../services/roomService";
import { ROOMS_COLLECTION } from "../Models/RoomModel";
//create a room
roomRouter.post("/roomId", async (req, res) => {
  try {
    const { roomTypeId, spaceId } = req.body;
    const roomid = await createRoom(roomTypeId, spaceId);
    console.log("Room created succesfully.Roomid: ", roomid);
    res.status(200).json({ message: "room created successsfully" });
  } catch (Error) {
    console.log("Error occured while creating rooms", Error);
  }
});

// Get all avatars
roomRouter.get("/:roomId", async (req, res) => {
  try {
    const { roomId } = req.params;
    const roomAssets = await getRoomAssets(roomId);
    res.json(roomAssets);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Get avatar by ID
roomRouter.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid avatar ID format" });
    }

    const space = await getSpaceIdByRoomId(id);

    if (!space) {
      return res.status(404).json({ error: "Avatar not found" });
    }

    res.json(space);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});
