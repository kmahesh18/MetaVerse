import { Document, ObjectId } from "mongodb";

export interface IUser extends Document {
  _id?: string | ObjectId;
  clerkId: string;
  avatarId?: string;
  emailId?: string | null;
  accessibleSpaces: string[];
  roomId?: string | null;
  spaceId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Collection name for reference
export const USERS_COLLECTION = "users";

// No schema definition needed with MongoDB
export default { USERS_COLLECTION };
