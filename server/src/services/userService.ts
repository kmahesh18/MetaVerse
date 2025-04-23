import { ObjectId } from "mongodb";
import { getDB } from "../db";
import { IUser, USERS_COLLECTION } from "../models/UserModel";

export async function getUserByClerkId(clerkId: string): Promise<IUser | null> {
  const db = await getDB();
  return db.collection(USERS_COLLECTION).findOne({ clerkId }) as unknown as IUser | null;
}

export async function createOrUpdateUser(clerkId: string, avatarId?: string) {
  const db = await getDB();
  const now = new Date();
  
  // Check if user exists
  const existingUser = await getUserByClerkId(clerkId);
  
  if (existingUser) {
    // Only update if avatarId is provided or different
    if (avatarId && existingUser.avatarId !== avatarId) {
      const update: Partial<IUser> = { 
        avatarId, 
        updatedAt: now 
      };
      
      return db.collection(USERS_COLLECTION).findOneAndUpdate(
        { clerkId },
        { $set: update },
        { returnDocument: "after" }
      );
    }
    return { value: existingUser };
  } else {
    // Create new user
    const newUser: Omit<IUser, '_id'> = { 
      clerkId, 
      ...(avatarId ? { avatarId } : {}),
      createdAt: now,
      updatedAt: now
    };
    
    await db.collection(USERS_COLLECTION).insertOne(newUser as any);
    return { value: newUser as IUser };
  }
}

export async function hasSelectedAvatar(clerkId: string): Promise<boolean> {
  const user = await getUserByClerkId(clerkId);
  return user !== null && !!user.avatarId;
}
