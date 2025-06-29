import { ObjectId } from "mongodb";
import { getDB } from "../db";
import { IUser, USERS_COLLECTION } from "../Models/UserModel";
import { ROOMS_COLLECTION } from "../Models/RoomModel";
import { clerkClient } from "@clerk/clerk-sdk-node";
import { access } from "fs";
import { roomsById } from "../state/state";
import { Client } from "../classes/Client";
import { getOrCreateRoom } from "../handlers/roomHandler";
import { ASSET_COLLECTION } from "../Models/AssetModel";

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

export async function createOrUpdateUser(clerkId: string, avatarId?: string,emailId?:string) {
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
    const newUser: IUser = {
      clerkId: clerkId,
      emailId: emailId,
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


export async function JoinRoom(client:Client, roomId: string) {
  try {
    const room = getOrCreateRoom(roomId);
    room?.addClient(client);
    client.roomId = roomId;
    return roomId;
  } catch (Error) {
    console.log("Error occured while joining room", Error);
    throw Error;
  }
}

export async function LeaveRoom(client:Client,roomId:string) {
  try {
    const room = getOrCreateRoom(roomId);
    room.removeClient(client);
    client.roomId = null;
    console.log("Room left successfully");
    return roomId;
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

export async function getNameByClerkId(clerkId: string): Promise<string> {
  try {
    // Get email from database
    const user = await getUserByClerkId(clerkId);
    
    if (user && user.emailId) {
      // Extract the part before @ as the name
      const namePart = user.emailId.split('@')[0];
      return namePart;
    } else {
      return "bot";
    }
  } catch (error) {
    console.log("Error occurred while extracting name from email:", error);
    throw error;
  }
}

export async function getUserAvatarName(clerkId:string){
  try{
    const db = await getDB();
    const user = await db.collection(USERS_COLLECTION).findOne({ clerkId: clerkId });
    const avatarId = user?.avatarId;
    
    const avatar = await db.collection(ASSET_COLLECTION).findOne({_id: new ObjectId(avatarId) });
    return avatar?.name;
  }
  catch(err){
    console.log("Error occured whilee getting avatar using clerkId",err)
  } 
}
