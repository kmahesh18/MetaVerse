import { ObjectId } from "mongodb";
import { getDB } from "../db";
import { IUser, USERS_COLLECTION } from "../Models/UserModel";
import { ROOMS_COLLECTION } from "../Models/RoomModel";
import { clerkClient } from "@clerk/clerk-sdk-node";
import { access } from "fs";

export async function getUserByClerkId(clerkId: string): Promise<IUser | null> {
  const db = await getDB();
  return db
    .collection(USERS_COLLECTION)
    .findOne({ clerkId }) as unknown as IUser | null;
}

export async function getAccessibleSpaces(
  clerkId: string,
): Promise<string[]> {
  // Get the user's accessible spaces from the database
  const db = await getDB();
  let accessibleSpaces: string[] = []; 
  const user = await db
    .collection(USERS_COLLECTION)
    .findOne({ clerkId }) as unknown as IUser | null;
  if (user) {
    accessibleSpaces = user.accessibleSpaces;
  }
  else{
    console.log("User not found");
  }
  return accessibleSpaces;
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
        updatedAt: now,
      };

      return db
        .collection(USERS_COLLECTION)
        .findOneAndUpdate(
          { clerkId },
          { $set: update },
          { returnDocument: "after" },
        );
    }
    return { value: existingUser };
  } else {
    // Create new user
    const emailobj = await getEmail(clerkId);
    const email = emailobj.toString();
    const newUser: IUser = {
      clerkId: clerkId,
      emailId: email,
      accessibleSpaces: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.collection(USERS_COLLECTION).insertOne(newUser as any);
    return { value: newUser as IUser };
  }
}

export async function hasSelectedAvatar(clerkId: string): Promise<boolean> {
  const user = await getUserByClerkId(clerkId);
  return user !== null && !!user.avatarId;
}

export async function getRoomId(userid: string): Promise<string> {
  try {
    const db = await getDB();
    const user = await db.collection(USERS_COLLECTION).findOne({ id: userid });
    return user?.roomId;
  } catch (Error) {
    console.log("Error occured while getting roomid");
    throw Error;
  }
}

export async function JoinRoom(userid: string, roomId: string) {
  try {
    const db = await getDB();
    const updateUser = await db
      .collection(USERS_COLLECTION)
      .updateOne({ id: userid }, { roomId: roomId });
    return roomId;
  } catch (Error) {
    console.log("Error occured while joining room", Error);
    throw Error;
  }
}

export async function LeaveRoom(userid: string) {
  try {
    const db = await getDB();
    const updateUser = await db
      .collection(USERS_COLLECTION)
      .updateOne({ id: userid }, { roomId: null });
    console.log("Room left successfully");
  } catch (Error) {
    console.log("Error occured while leaving room", Error);
    throw Error;
  }
}

export async function getClerkId(emailId: string): Promise<string> {
  const db = await getDB();
  const user = await db
    .collection(USERS_COLLECTION)
    .findOne({ emailId: emailId });
  return user?.clerkId;
}

export async function getEmail(clerkId: string): Promise<string> {
  try {
    const clerkuser = await clerkClient.users.getUser(clerkId);
    const emailobj = clerkuser.emailAddresses.find(
      (email) => email.id === clerkuser.primaryEmailAddressId,
    );
    if (emailobj) {
      const email = emailobj.toString();
      return email;
    } else {
      return "";
    }
  } catch (Error) {
    console.log("error occured while getting email id by clerk id", Error);
    throw Error;
  }
}
