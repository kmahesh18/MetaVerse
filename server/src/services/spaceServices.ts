import { getDB } from "../db";
import { Space_Collection } from "../Models/SpaceType";

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
