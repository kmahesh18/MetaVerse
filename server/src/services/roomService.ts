import { ObjectId } from "mongodb";
import { getDB } from "../db";
import { IRoom, ROOMS_COLLECTION } from "../Models/RoomModel";

// Get which space a room belongs to
export async function getSpaceIdByRoomId(
	roomId: string
): Promise<string | null> {
	const db = await getDB();
	const id = ObjectId.isValid(roomId) ? new ObjectId(roomId) : roomId;

	const room = await db
		.collection(ROOMS_COLLECTION)
		.findOne({ id: id }, { projection: { spaceId: 1 } });

	return room ? room.spaceId : null;
}

// Get assets for a room
export async function getRoomAssets(roomId: string): Promise<any[]> {
	const db = await getDB();
	const roomid = ObjectId.isValid(roomId) ? new ObjectId(roomId) : roomId;

	const room = await db.collection(ROOMS_COLLECTION).findOne({ id: roomid });
	if (!room) return [];

	// Fetch the roomType to get its assets
	const roomType = await db.collection("roomType").findOne({
		_id: ObjectId.isValid(room.roomTypeId)
			? new ObjectId(room.roomTypeId)
			: room.roomTypeId,
	});

	return roomType?.assets || [];
}
