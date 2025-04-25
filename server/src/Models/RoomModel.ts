import { Document, ObjectId } from "mongodb";

export interface IRoom extends Document {
  _id?: ObjectId;
  id: string; // UUID string
  spaceId: string; // UUID string
  roomTypeId: string; // UUID string
  createdAt: Date;
}

// Collection name for reference
export const ROOMS_COLLECTION = "rooms";

// No schema definition needed with MongoDB
export default { ROOMS_COLLECTION };
