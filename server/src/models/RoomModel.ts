import { Document, ObjectId } from "mongodb";

export interface IRoom extends Document {
	_id?: string | ObjectId; // UUID string or MongoDB ObjectId
	spaceId: string; // UUID string
	roomTypeId: string; // UUID string
	createdAt: Date;
}

// Collection name for reference
export const ROOMS_COLLECTION = "rooms";

// No schema definition needed with MongoDB
export default { ROOMS_COLLECTION };