import { ObjectId } from "mongodb";
import { getDB } from "../db";
import { IRoom, ROOMS_COLLECTION } from "../Models/RoomModel";
import { IAsset } from "../Models/AssetModel";
import { RoomType_Collection } from "../Models/RoomType";
import { UpdateFilter } from "mongodb";
import { ISpace } from "../Models/SpaceType";
import { Space_Collection } from "../Models/SpaceType";
import { v4 } from "uuid";
//create Room
export async function createRoom(roomTypeId: string, spaceId: string) {
  try {
    const db = await getDB();
    const id = v4();
    const createdAt = new Date();

    // 1. Create the room
    const data = {
      id: id,
      spaceId: spaceId,
      roomTypeId: roomTypeId,
      createdAt: createdAt,
    };
    await db.collection(ROOMS_COLLECTION).insertOne(data);
    const updateFilter: UpdateFilter<ISpace> = {
      $push: { roomids: id } as any,
    };
    // 2. Update the space document - FIXED $push syntax
    await db.collection(Space_Collection).updateOne(
      { id: spaceId },
      updateFilter, // Correct $push operator syntax
    );

    console.log("Room creation successful");
    return id;
  } catch (error) {
    console.log("Room creation Failed due to", error);
    throw error;
  }
}

// Get which space a room belongs to
export async function getSpaceIdByRoomId(
  roomId: string,
): Promise<string | null> {
  const db = await getDB();
  const id = ObjectId.isValid(roomId) ? new ObjectId(roomId) : roomId;

  const room = await db
    .collection(ROOMS_COLLECTION)
    .findOne({ id: id }, { projection: { spaceId: 1 } });

  return room ? room.spaceId : null;
}

// Get assets for a room
export async function getRoomAssets(roomId: string): Promise<IAsset[]> {
  const db = await getDB();
  const roomid = ObjectId.isValid(roomId) ? new ObjectId(roomId) : roomId;

  const room = await db.collection(ROOMS_COLLECTION).findOne({ id: roomid });
  const roomtypeid = room?.roomTypeId;
  if (!room) return [];

  const res = await db
    .collection(RoomType_Collection)
    .findOne({ id: roomtypeid });
  const assets: IAsset[] = res?.assets;

  // Fetch the roomType to get its assets

  return assets;
}

export async function getRoomTypeId(roomId: string): Promise<string> {
  const db = await getDB();
  const room = await db.collection(ROOMS_COLLECTION).findOne({ id: roomId });
  const roomTypeId = room?.roomTypeId;
  return roomTypeId;
}