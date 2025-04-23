import { Document, ObjectId } from "mongodb";

export interface IUser extends Document {
    _id?: string | ObjectId; // UUID string or MongoDB ObjectId
    clerkId: string;
    avatarId?: string;
    roomId?: string;
    spaceId?: string;
    createdAt: Date;
    updatedAt: Date;
}

// Collection name for reference
export const USERS_COLLECTION = "users";

// No schema definition needed with MongoDB
export default { USERS_COLLECTION }; 