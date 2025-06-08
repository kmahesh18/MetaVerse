import { v4 } from "uuid";
import { getDB } from "../db";
import { Space_Collection, ISpace } from "../Models/SpaceType";
import { USERS_COLLECTION, IUser } from "../Models/UserModel";
import { getClerkId } from "./userService"; // Assuming this is used elsewhere or can be removed if not
import { getUserByClerkId } from "./userService";
import { IRoom, ROOMS_COLLECTION } from "../Models/RoomModel";
import { createRoom } from "./roomService";

export async function createSpace(adminid: string, selectedRoomTypes: { typeId: string; count: number }[]) {
  if (!adminid) {
    throw new Error("Admin ID is required");
  }
  if (!selectedRoomTypes?.length) {
    throw new Error("At least one room type must be selected");
  }

  const spaceId = v4();
  const roomids: string[] = [];
  const db = await getDB();

  for (const roomType of selectedRoomTypes) {
    if (!roomType.typeId || typeof roomType.count !== 'number' || roomType.count < 1) {
      console.error(`Invalid room type configuration skipped: ${JSON.stringify(roomType)}`);
      continue; 
    }

    for (let i = 0; i < roomType.count; i++) {
      try {
        const roomId = await createRoom(roomType.typeId, spaceId);
        roomids.push(roomId);
      } catch (error: any) {
        console.error(`Failed to create room type ${roomType.typeId} (iteration ${i + 1}):`, error);
        throw new Error(`Failed to create a required room: ${error.message}`);
      }
    }
  }

  if (roomids.length === 0) {
    throw new Error("No rooms could be created based on the provided types.");
  }

  const spaceData: ISpace = {
    id: spaceId,
    roomids: roomids,
    adminid: adminid,
    activeuserids: [],
    accessibleuserids: [adminid],
  };

  try {
    const insertResult = await db.collection<ISpace>(Space_Collection).insertOne(spaceData);
    if (!insertResult.insertedId) {
      throw new Error("Space insertion failed: No insertedId returned.");
    }

    // Add the new space ID to the admin user's accessibleSpaces
    const userUpdateResult = await db.collection<IUser>(USERS_COLLECTION).updateOne(
      { clerkId: adminid },
      { $addToSet: { accessibleSpaces: spaceId } }
    );

    if (userUpdateResult.matchedCount === 0) {
      console.error(`Admin user ${adminid} not found. Space ${spaceId} created but not added to user list.`);
    }

  } catch (error) {
    console.error(`Error during space finalization (DB insert/user update) for space ID ${spaceId}:`, error);
    throw error;
  }

  console.log(`Space ${spaceId} created successfully with rooms: ${roomids.join(', ')}`);
  return spaceId;
}


export async function giveUserAccesToSpace(adminId: string, spaceId: string, emailId: string) {
  try {
    // Await the promise from getClerkId to properly get the value
    const clerkId = await getClerkId(emailId);
    
    if (!clerkId) {
      throw new Error(`Could not determine Clerk ID for email: ${emailId}`);
    }

    const db = await getDB();
    const space = await db.collection<ISpace>(Space_Collection).findOne({ id: spaceId });

    if (!space) {
      throw new Error(`Space not found: ${spaceId}`);
    }
    if (space.adminid !== adminId) {
      throw new Error(`Admin ID mismatch: User ${adminId} is not the admin of space ${spaceId}`);
    }

    const user = await db.collection<IUser>(USERS_COLLECTION).findOne({ clerkId: clerkId });
    if (!user) {
      throw new Error(`User not found: ${clerkId}`);
    }

    // Check if user already has access to avoid duplicate operations
    if (space.accessibleuserids.includes(clerkId)) {
      console.log(`User ${clerkId} already has access to space ${spaceId}`);
      return clerkId;
    }

    await db.collection<ISpace>(Space_Collection).updateOne(
      { id: spaceId },
      { $addToSet: { accessibleuserids: clerkId } }
    );

    await db.collection<IUser>(USERS_COLLECTION).updateOne(
      { clerkId: clerkId },
      { $addToSet: { accessibleSpaces: spaceId } }
    );

    console.log(`User ${clerkId} granted access to space ${spaceId} by admin ${adminId}`);
    return clerkId;

  } catch (error) {
    console.error(`Error giving user access to space ${spaceId}:`, error);
    throw error; // Re-throw for the router to handle
  }
}

export async function joinSpace(spaceId: string, clerkId: string) {
  try {
    const db = await getDB();
    const user = await getUserByClerkId(clerkId);
    if (!user) {
      throw new Error(`User not found: ${clerkId}`);
    }

    // Check if user has access before allowing them to join (become active)
    const space = await db.collection<ISpace>(Space_Collection).findOne({ id: spaceId });
    if (!space) {
      throw new Error(`Space not found: ${spaceId}`);
    }
    if (!space.accessibleuserids.includes(clerkId)) {
      throw new Error(`User ${clerkId} does not have access to space ${spaceId}`);
    }

    // Add user to active list in the space
    await db.collection<ISpace>(Space_Collection).updateOne(
      { id: spaceId },
      { $addToSet: { activeuserids: clerkId } }
    );

    // Update user's current space (if this is the intended logic)
    await db.collection<IUser>(USERS_COLLECTION).updateOne(
      { clerkId: clerkId }, 
      { $set: { spaceId: spaceId } } // Fix: Use $set operator
    );

    return clerkId;

  } catch (error) {
    console.error(`Error joining space ${spaceId} for user ${clerkId}:`, error);
    throw error;
  }
}

export async function LeaveSpace(spaceId: string, clerkId: string) {
  try {
    const db = await getDB();
    
    // First check if the space exists and if the user is active in it
    const space = await db.collection<ISpace>(Space_Collection).findOne({ 
      id: spaceId,
      activeuserids: clerkId // Make sure user is in the activeuserids array
    });

    if (!space) {
      console.warn(`LeaveSpace: Space ${spaceId} not found or user ${clerkId} not active in it.`);
      return clerkId; // Return the clerkId to maintain API consistency
    }
    
    // Remove user from active list in the space - fix $pull operation
    const spaceUpdateResult = await db.collection<ISpace>(Space_Collection).updateOne(
      { id: spaceId },
      { $unset: { activeuserids: clerkId } }
    );

    if (spaceUpdateResult.modifiedCount === 0) {
      console.warn(`LeaveSpace: No changes made to space ${spaceId}.`);
    }
    
    // Clear the user's current space
    const userUpdateResult = await db.collection<IUser>(USERS_COLLECTION).updateOne(
      { clerkId: clerkId },
      { $unset: { spaceId: "" } } // Use $unset to remove the field
    );
    
    if (userUpdateResult.modifiedCount === 0) {
      console.warn(`LeaveSpace: No changes made to user ${clerkId}.`);
    }
    
    console.log(`User ${clerkId} left space ${spaceId}`);
    return clerkId;

  } catch (error) {
    console.error(`Error leaving space ${spaceId} for user ${clerkId}:`, error);
    throw error;
  }
}

// Helper functions to get specific space details
async function findSpace(spaceid: string): Promise<ISpace | null> {
  const db = await getDB();
  return db.collection<ISpace>(Space_Collection).findOne({ id: spaceid });
}

export async function getAccessibleUserids(spaceid: string): Promise<string[]> {
  const space = await findSpace(spaceid);
  return space?.accessibleuserids || [];
}

export async function getAdminid(spaceid: string): Promise<string | null> {
  const space = await findSpace(spaceid);
  return space?.adminid || null;
}

export async function getActiveUserIds(spaceid: string): Promise<string[]> {
  const space = await findSpace(spaceid);
  return space?.activeuserids || [];
}

export async function getRoomIds(spaceid: string): Promise<string[]> {
  const space = await findSpace(spaceid);
  return space?.roomids || [];
}
