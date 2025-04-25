import { Router } from "express";
import { createRoom } from "../services/roomService";
import { v4 } from "uuid";
import { createSpace } from "../services/spaceServices";

export const spacesRouter = Router();

// Get all spaces for a user
spacesRouter.get("/", (_req, res) => {
  // Temporarily return an empty array until we implement spaces
  res.json([]);
});

// Create a new space
spacesRouter.post("/", async (req, res) => {
  try {
    const { RoomPref, rooms_num, adminid } = req.body;
    const spaceid = await createSpace(adminid);
    RoomPref.forEach(async (value: number, key: string) => {
      for (let i = 0; i < value; i++) {
        const result = await createRoom(key, spaceid);
      }
    });
  } catch (Error) {
    console.log("Error while creating sspace", Error);
    res.status(501).json({ message: "Not implemented yet" });
  }
});

// Get space by ID
spacesRouter.get("/:id", (req, res) => {
  // Not implemented yet
  res.status(501).json({ message: "Not implemented yet", id: req.params.id });
});

// Update a space
spacesRouter.patch("/:id", (req, res) => {
  // Not implemented yet
  res.status(501).json({ message: "Not implemented yet", id: req.params.id });
});
