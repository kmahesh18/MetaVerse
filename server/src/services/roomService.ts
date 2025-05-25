import { v4 } from "uuid";
import { getDB } from "../db";
import { IRoom, ROOMS_COLLECTION } from "../Models/RoomModel";
import { RoomType_Collection, IRoomType } from "../Models/RoomType";
import { ASSET_COLLECTION, IAsset } from "../Models/AssetModel";
import { getOrCreateRoom } from "../handlers/roomHandler";
import { USERS_COLLECTION } from "../Models/UserModel";
import { ObjectId } from "mongodb";
import { Playerpos } from "../state/state";

// Create Room
export async function createRoom(roomTypeId: string, spaceId: string): Promise<string> {
  try {
    const db = await getDB();
    const id = v4();
    const createdAt = new Date();
    const roomData: IRoom = {
      id,
      spaceId,
      roomTypeId,
      createdAt,
    };
    
    const insertResult = await db.collection<IRoom>(ROOMS_COLLECTION).insertOne(roomData);
    if (!insertResult.insertedId) {
      throw new Error("DB insertion failed: No insertedId returned.");
    }
    console.log(`Room ${id} (type: ${roomTypeId}) created successfully for space ${spaceId}`);
    return id;
  } catch (error: any) {
    console.error(`Error creating room (type: ${roomTypeId}, space: ${spaceId}):`, error);
    throw new Error(`Failed to create room: ${error.message}`); // Re-throw simplified error
  }
}

// Get which space a room belongs to
export async function getSpaceIdByRoomId(roomId: string): Promise<string | null> {
  try {
    const db = await getDB();
    const room = await db
      .collection<IRoom>(ROOMS_COLLECTION)
      .findOne({ id: roomId }, { projection: { spaceId: 1 } });
    return room?.spaceId || null;
  } catch (error: any) {
      console.error(`Error fetching spaceId for room ${roomId}:`, error);
      throw error; // Re-throw original error
  }
}

// Get assets for a room based on its type
export async function getRoomAssets(roomId: string): Promise<IAsset[]> {
  try {
    const db = await getDB();
    const room = await db.collection<IRoom>(ROOMS_COLLECTION).findOne({ id: roomId }, { projection: { roomTypeId: 1 } });
    
    if (!room?.roomTypeId) {
      console.warn(`Room ${roomId} not found or has no roomTypeId.`);
      return [];
    }

    const roomType = await db
      .collection<IRoomType>(RoomType_Collection)
      .findOne({ id: room.roomTypeId }, { projection: { assets: 1 } });

    return roomType?.assets || [];
  } catch (error: any) {
      console.error(`Error fetching assets for room ${roomId}:`, error);
      throw error; // Re-throw original error
  }
}

// Get room type ID for a room
export async function getRoomTypeId(roomId: string): Promise<string | null> {
  try {
    const db = await getDB();
    const room = await db.collection(ROOMS_COLLECTION).findOne({ id: roomId });
    return room?.roomTypeId || null;
  } catch (error) {
    console.log("Error in getRoomTypeId:", error);
    throw error;
  }
}


export async function getRoomPlayersAvatars(roomId: string) {
  try {
    const db = await getDB();
    const room = getOrCreateRoom(roomId);
    const clients = room.clients;
    const clientAvatars = new Map();
    
    await Promise.all(
      Array.from(clients.values()).map(async (client) => {
        const userId = client.userId;
        const user = await db.collection(USERS_COLLECTION).findOne({ clerkId: userId });
        if (user?.avatarId) {
          const avatarId = user.avatarId;
          const avatar = await db.collection(ASSET_COLLECTION).findOne({_id: new ObjectId(avatarId) });
          clientAvatars.set(userId, avatar?.name|| null);
        } else {
          console.log(`No avatarId found for user ${userId}`);
          clientAvatars.set(client.id, null);
        }
      })
    );
    return clientAvatars;
  }
  catch (error) {
    console.log("error occured in room ssevices while getting room Players avatars")
  }
}
