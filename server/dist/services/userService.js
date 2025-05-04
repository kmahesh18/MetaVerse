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
exports.getRoomId = getRoomId;
exports.JoinRoom = JoinRoom;
exports.LeaveRoom = LeaveRoom;
exports.getClerkId = getClerkId;
exports.getEmail = getEmail;
const db_1 = require("../db");
const UserModel_1 = require("../Models/UserModel");
const clerk_sdk_node_1 = require("@clerk/clerk-sdk-node");
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
function createOrUpdateUser(clerkId, avatarId) {
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
            // Create new user
            const emailobj = yield getEmail(clerkId);
            const email = emailobj.toString();
            const newUser = {
                clerkId: clerkId,
                emailId: email,
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
function getRoomId(userid) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const db = yield (0, db_1.getDB)();
            const user = yield db.collection(UserModel_1.USERS_COLLECTION).findOne({ id: userid });
            return user === null || user === void 0 ? void 0 : user.roomId;
        }
        catch (Error) {
            console.log("Error occured while getting roomid");
            throw Error;
        }
    });
}
function JoinRoom(userid, roomId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const db = yield (0, db_1.getDB)();
            const updateUser = yield db
                .collection(UserModel_1.USERS_COLLECTION)
                .updateOne({ id: userid }, { roomId: roomId });
            return roomId;
        }
        catch (Error) {
            console.log("Error occured while joining room", Error);
            throw Error;
        }
    });
}
function LeaveRoom(userid) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const db = yield (0, db_1.getDB)();
            const updateUser = yield db
                .collection(UserModel_1.USERS_COLLECTION)
                .updateOne({ id: userid }, { roomId: null });
            console.log("Room left successfully");
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
