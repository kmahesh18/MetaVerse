import { ObjectId } from "mongodb";
import { getDB } from "../db";
import { IRoom, ROOMS_COLLECTION } from "../Models/RoomModel";
import { IAsset } from "../Models/AssetModel";
import { RoomType_Collection } from "../Models/RoomType";

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
