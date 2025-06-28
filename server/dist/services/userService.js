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
exports.getUserByClerkId = getUserByClerkId;
exports.getAccessibleSpaces = getAccessibleSpaces;
exports.createOrUpdateUser = createOrUpdateUser;
exports.hasSelectedAvatar = hasSelectedAvatar;
exports.JoinRoom = JoinRoom;
exports.LeaveRoom = LeaveRoom;
exports.getClerkId = getClerkId;
exports.getEmail = getEmail;
exports.getNameByClerkId = getNameByClerkId;
exports.getUserAvatarName = getUserAvatarName;
const mongodb_1 = require("mongodb");
const db_1 = require("../db");
const UserModel_1 = require("../Models/UserModel");
const clerk_sdk_node_1 = require("@clerk/clerk-sdk-node");
const roomHandler_1 = require("../handlers/roomHandler");
const AssetModel_1 = require("../Models/AssetModel");
function getUserByClerkId(clerkId) {
    return __awaiter(this, void 0, void 0, function* () {
        const db = yield (0, db_1.getDB)();
        return db
            .collection(UserModel_1.USERS_COLLECTION)
            .findOne({ clerkId });
    });
}
function getAccessibleSpaces(clerkId) {
    return __awaiter(this, void 0, void 0, function* () {
        // Get the user's accessible spaces from the database
        const db = yield (0, db_1.getDB)();
        let accessibleSpaces = [];
        const user = yield db
            .collection(UserModel_1.USERS_COLLECTION)
            .findOne({ clerkId });
        if (user) {
            accessibleSpaces = user.accessibleSpaces;
        }
        else {
            console.log("User not found");
        }
        return accessibleSpaces;
    });
}
function createOrUpdateUser(clerkId, avatarId, emailId) {
    return __awaiter(this, void 0, void 0, function* () {
        const db = yield (0, db_1.getDB)();
        const now = new Date();
        // Check if user exists
        const existingUser = yield getUserByClerkId(clerkId);
        if (existingUser) {
            // Only update if avatarId is provided or different
            if (avatarId && existingUser.avatarId !== avatarId) {
                const update = {
                    avatarId,
                    updatedAt: now,
                };
                return db
                    .collection(UserModel_1.USERS_COLLECTION)
                    .findOneAndUpdate({ clerkId }, { $set: update }, { returnDocument: "after" });
            }
            return { value: existingUser };
        }
        else {
            const newUser = {
                clerkId: clerkId,
                emailId: emailId,
                accessibleSpaces: [],
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            yield db.collection(UserModel_1.USERS_COLLECTION).insertOne(newUser);
            return { value: newUser };
        }
    });
}
function hasSelectedAvatar(clerkId) {
    return __awaiter(this, void 0, void 0, function* () {
        const user = yield getUserByClerkId(clerkId);
        return user !== null && !!user.avatarId;
    });
}
function JoinRoom(client, roomId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const room = (0, roomHandler_1.getOrCreateRoom)(roomId);
            room === null || room === void 0 ? void 0 : room.addClient(client);
            client.roomId = roomId;
            return roomId;
        }
        catch (Error) {
            console.log("Error occured while joining room", Error);
            throw Error;
        }
    });
}
function LeaveRoom(client, roomId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const room = (0, roomHandler_1.getOrCreateRoom)(roomId);
            room.removeClient(client);
            client.roomId = null;
            console.log("Room left successfully");
            return roomId;
        }
        catch (Error) {
            console.log("Error occured while leaving room", Error);
            throw Error;
        }
    });
}
function getClerkId(emailId) {
    return __awaiter(this, void 0, void 0, function* () {
        const db = yield (0, db_1.getDB)();
        const user = yield db
            .collection(UserModel_1.USERS_COLLECTION)
            .findOne({ emailId: emailId });
        return user === null || user === void 0 ? void 0 : user.clerkId;
    });
}
function getEmail(clerkId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const clerkuser = yield clerk_sdk_node_1.clerkClient.users.getUser(clerkId);
            const emailobj = clerkuser.emailAddresses.find((email) => email.id === clerkuser.primaryEmailAddressId);
            if (emailobj) {
                const email = emailobj.toString();
                return email;
            }
            else {
                return "";
            }
        }
        catch (Error) {
            console.log("error occured while getting email id by clerk id", Error);
            throw Error;
        }
    });
}
function getNameByClerkId(clerkId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Get email from database
            const user = yield getUserByClerkId(clerkId);
            if (user && user.emailId) {
                // Extract the part before @ as the name
                const namePart = user.emailId.split('@')[0];
                return namePart;
            }
            else {
                return "bot";
            }
        }
        catch (error) {
            console.log("Error occurred while extracting name from email:", error);
            throw error;
        }
    });
}
function getUserAvatarName(clerkId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const db = yield (0, db_1.getDB)();
            const user = yield db.collection(UserModel_1.USERS_COLLECTION).findOne({ clerkId: clerkId });
            const avatarId = user === null || user === void 0 ? void 0 : user.avatarId;
            const avatar = yield db.collection(AssetModel_1.ASSET_COLLECTION).findOne({ _id: new mongodb_1.ObjectId(avatarId) });
            return avatar === null || avatar === void 0 ? void 0 : avatar.name;
        }
        catch (err) {
            console.log("Error occured whilee getting avatar using clerkId", err);
        }
    });
}
