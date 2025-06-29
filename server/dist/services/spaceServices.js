"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSpace = createSpace;
exports.giveUserAccesToSpace = giveUserAccesToSpace;
exports.joinSpace = joinSpace;
exports.LeaveSpace = LeaveSpace;
exports.getAccessibleUserids = getAccessibleUserids;
exports.getAdminid = getAdminid;
exports.getActiveUserIds = getActiveUserIds;
exports.getRoomIds = getRoomIds;
const uuid_1 = require("uuid");
const db_1 = require("../db");
const SpaceType_1 = require("../Models/SpaceType");
const UserModel_1 = require("../Models/UserModel");
const userService_1 = require("./userService"); // Assuming this is used elsewhere or can be removed if not
const userService_2 = require("./userService");
const roomService_1 = require("./roomService");
function createSpace(adminid, selectedRoomTypes) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!adminid) {
            throw new Error("Admin ID is required");
        }
        if (!(selectedRoomTypes === null || selectedRoomTypes === void 0 ? void 0 : selectedRoomTypes.length)) {
            throw new Error("At least one room type must be selected");
        }
        const spaceId = (0, uuid_1.v4)();
        const roomids = [];
        const db = yield (0, db_1.getDB)();
        for (const roomType of selectedRoomTypes) {
            if (!roomType.typeId || typeof roomType.count !== 'number' || roomType.count < 1) {
                console.error(`Invalid room type configuration skipped: ${JSON.stringify(roomType)}`);
                continue;
            }
            for (let i = 0; i < roomType.count; i++) {
                try {
                    const roomId = yield (0, roomService_1.createRoom)(roomType.typeId, spaceId);
                    roomids.push(roomId);
                }
                catch (error) {
                    console.error(`Failed to create room type ${roomType.typeId} (iteration ${i + 1}):`, error);
                    throw new Error(`Failed to create a required room: ${error.message}`);
                }
            }
        }
        if (roomids.length === 0) {
            throw new Error("No rooms could be created based on the provided types.");
        }
        const spaceData = {
            id: spaceId,
            roomids: roomids,
            adminid: adminid,
            activeuserids: [],
            accessibleuserids: [adminid],
        };
        try {
            const insertResult = yield db.collection(SpaceType_1.Space_Collection).insertOne(spaceData);
            if (!insertResult.insertedId) {
                throw new Error("Space insertion failed: No insertedId returned.");
            }
            // Add the new space ID to the admin user's accessibleSpaces
            const userUpdateResult = yield db.collection(UserModel_1.USERS_COLLECTION).updateOne({ clerkId: adminid }, { $addToSet: { accessibleSpaces: spaceId } });
            if (userUpdateResult.matchedCount === 0) {
                console.error(`Admin user ${adminid} not found. Space ${spaceId} created but not added to user list.`);
            }
        }
        catch (error) {
            console.error(`Error during space finalization (DB insert/user update) for space ID ${spaceId}:`, error);
            throw error;
        }
        console.log(`Space ${spaceId} created successfully with rooms: ${roomids.join(', ')}`);
        return spaceId;
    });
}
function giveUserAccesToSpace(adminId, spaceId, emailId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Await the promise from getClerkId to properly get the value
            const clerkId = yield (0, userService_1.getClerkId)(emailId);
            if (!clerkId) {
                throw new Error(`Could not determine Clerk ID for email: ${emailId}`);
            }
            const db = yield (0, db_1.getDB)();
            const space = yield db.collection(SpaceType_1.Space_Collection).findOne({ id: spaceId });
            if (!space) {
                throw new Error(`Space not found: ${spaceId}`);
            }
            if (space.adminid !== adminId) {
                throw new Error(`Admin ID mismatch: User ${adminId} is not the admin of space ${spaceId}`);
            }
            const user = yield db.collection(UserModel_1.USERS_COLLECTION).findOne({ clerkId: clerkId });
            if (!user) {
                throw new Error(`User not found: ${clerkId}`);
            }
            // Check if user already has access to avoid duplicate operations
            if (space.accessibleuserids.includes(clerkId)) {
                console.log(`User ${clerkId} already has access to space ${spaceId}`);
                return clerkId;
            }
            yield db.collection(SpaceType_1.Space_Collection).updateOne({ id: spaceId }, { $addToSet: { accessibleuserids: clerkId } });
            yield db.collection(UserModel_1.USERS_COLLECTION).updateOne({ clerkId: clerkId }, { $addToSet: { accessibleSpaces: spaceId } });
            console.log(`User ${clerkId} granted access to space ${spaceId} by admin ${adminId}`);
            return clerkId;
        }
        catch (error) {
            console.error(`Error giving user access to space ${spaceId}:`, error);
            throw error; // Re-throw for the router to handle
        }
    });
}
function joinSpace(spaceId, clerkId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const db = yield (0, db_1.getDB)();
            const user = yield (0, userService_2.getUserByClerkId)(clerkId);
            if (!user) {
                throw new Error(`User not found: ${clerkId}`);
            }
            // Check if user has access before allowing them to join (become active)
            const space = yield db.collection(SpaceType_1.Space_Collection).findOne({ id: spaceId });
            if (!space) {
                throw new Error(`Space not found: ${spaceId}`);
            }
            if (!space.accessibleuserids.includes(clerkId)) {
                throw new Error(`User ${clerkId} does not have access to space ${spaceId}`);
            }
            // Add user to active list in the space
            yield db.collection(SpaceType_1.Space_Collection).updateOne({ id: spaceId }, { $addToSet: { activeuserids: clerkId } });
            // Update user's current space (if this is the intended logic)
            yield db.collection(UserModel_1.USERS_COLLECTION).updateOne({ clerkId: clerkId }, { $set: { spaceId: spaceId } } // Fix: Use $set operator
            );
            console.log(`User ${clerkId} joined space ${spaceId}`);
            return clerkId;
        }
        catch (error) {
            console.error(`Error joining space ${spaceId} for user ${clerkId}:`, error);
            throw error;
        }
    });
}
function LeaveSpace(spaceId, clerkId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const db = yield (0, db_1.getDB)();
            // First check if the space exists and if the user is active in it
            const space = yield db.collection(SpaceType_1.Space_Collection).findOne({
                id: spaceId,
                activeuserids: clerkId // Make sure user is in the activeuserids array
            });
            if (!space) {
                console.warn(`LeaveSpace: Space ${spaceId} not found or user ${clerkId} not active in it.`);
                return clerkId; // Return the clerkId to maintain API consistency
            }
            // Remove user from active list in the space - fix $pull operation
            const spaceUpdateResult = yield db.collection(SpaceType_1.Space_Collection).updateOne({ id: spaceId }, { $unset: { activeuserids: clerkId } });
            if (spaceUpdateResult.modifiedCount === 0) {
                console.warn(`LeaveSpace: No changes made to space ${spaceId}.`);
            }
            // Clear the user's current space
            const userUpdateResult = yield db.collection(UserModel_1.USERS_COLLECTION).updateOne({ clerkId: clerkId }, { $unset: { spaceId: "" } } // Use $unset to remove the field
            );
            if (userUpdateResult.modifiedCount === 0) {
                console.warn(`LeaveSpace: No changes made to user ${clerkId}.`);
            }
            console.log(`User ${clerkId} left space ${spaceId}`);
            return clerkId;
        }
        catch (error) {
            console.error(`Error leaving space ${spaceId} for user ${clerkId}:`, error);
            throw error;
        }
    });
}
// Helper functions to get specific space details
function findSpace(spaceid) {
    return __awaiter(this, void 0, void 0, function* () {
        const db = yield (0, db_1.getDB)();
        return db.collection(SpaceType_1.Space_Collection).findOne({ id: spaceid });
    });
}
function getAccessibleUserids(spaceid) {
    return __awaiter(this, void 0, void 0, function* () {
        const space = yield findSpace(spaceid);
        return (space === null || space === void 0 ? void 0 : space.accessibleuserids) || [];
    });
}
function getAdminid(spaceid) {
    return __awaiter(this, void 0, void 0, function* () {
        const space = yield findSpace(spaceid);
        return (space === null || space === void 0 ? void 0 : space.adminid) || null;
    });
}
function getActiveUserIds(spaceid) {
    return __awaiter(this, void 0, void 0, function* () {
        const space = yield findSpace(spaceid);
        return (space === null || space === void 0 ? void 0 : space.activeuserids) || [];
    });
}
function getRoomIds(spaceid) {
    return __awaiter(this, void 0, void 0, function* () {
        const space = yield findSpace(spaceid);
        return (space === null || space === void 0 ? void 0 : space.roomids) || [];
    });
}
