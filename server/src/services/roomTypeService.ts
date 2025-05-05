import { getDB } from "../db";
import { IRoomType, RoomType_Collection } from "../Models/RoomType";

// Fetch all room types
export async function getAllRoomTypes() : Promise<IRoomType[]> {
  try {
    const db = await getDB();
    const roomTypes = await db.collection<IRoomType>(RoomType_Collection).find({}).toArray();
    console.log("Room types retrieved successfully:", roomTypes);
    return roomTypes;
  } catch (error) {
    console.error("Error fetching room types:", error);
    throw new Error(`Failed to fetch room types: ${error}`);
  }
}
