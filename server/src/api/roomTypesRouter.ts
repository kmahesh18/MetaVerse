import { Router } from "express";
import { getAllRoomTypes } from "../services/roomTypeService";

export const roomTypesRouter = Router();

// Get all room types
roomTypesRouter.get("/", async (req, res) => {
  try {
    console.log("Fetching room types...");
    const roomTypes = await getAllRoomTypes();
    
    console.log(`Successfully retrieved ${roomTypes.length} room types`);
    
    if (!roomTypes || roomTypes.length === 0) {
      console.log("No room types found, returning empty array");
      return res.json([]);
    }
    res.json(roomTypes);
  } catch (error: any) {
    console.error("GET /api/roomtypes - Error:", error.message);
    res.status(500).json({ message: error.message || "Error fetching room types" });
  }
});
