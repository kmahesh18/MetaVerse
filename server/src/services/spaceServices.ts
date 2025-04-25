import { v4 } from "uuid";
import { getDB } from "../db";
import { Space_Collection } from "../Models/SpaceType";

export async function createSpace(adminid: string) {
  try {
    const id = v4();
    const data = {
      id: id,
      roomids: [],
      adminid: adminid,
      activeuserids: [],
      accessibleuserids: [],
    };
    const db = await getDB();
    const res = await db.collection(Space_Collection).insertOne(data);
    console.log("Space created successfully");
    return id;
  } catch (Error) {
    console.log("error occured while creating space", Error);
    throw Error;
  }
}

export async function getAccessibleUserids(spaceid: string): Promise<string[]> {
  const db = await getDB();
  const res = await db.collection(Space_Collection).findOne({ id: spaceid });
  const accessibleUsers = res?.accessibleuserids;
  return accessibleUsers;
}

export async function getAdminid(spaceid: string): Promise<string> {
  const db = await getDB();
  const res = await db.collection(Space_Collection).findOne({ id: spaceid });
  const adminid = res?.adminid;
  return adminid;
}

export async function getActiveUserIds(spaceid: string): Promise<string[]> {
  const db = await getDB();
  const res = await db.collection(Space_Collection).findOne({ id: spaceid });
  const activeusers = res?.activeuserids;
  return activeusers;
}

export async function getRoomIds(spaceid: string): Promise<string[]> {
  const db = await getDB();
  const res = await db.collection(Space_Collection).findOne({ id: spaceid });
  const roomids = res?.roomids;
  return roomids;
}
