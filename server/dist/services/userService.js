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
exports.createOrUpdateUser = createOrUpdateUser;
exports.hasSelectedAvatar = hasSelectedAvatar;
const db_1 = require("../db");
<<<<<<< HEAD
function getUserByClerkId(clerkId) {
    return __awaiter(this, void 0, void 0, function* () {
        const db = yield (0, db_1.getDB)();
        return db.collection("users").findOne({ clerkId });
=======
const UserModel_1 = require("../models/UserModel");
function getUserByClerkId(clerkId) {
    return __awaiter(this, void 0, void 0, function* () {
        const db = yield (0, db_1.getDB)();
        return db.collection(UserModel_1.USERS_COLLECTION).findOne({ clerkId });
>>>>>>> 4410ea2acdac28177a285241b07c4a11c5962382
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
                    updatedAt: now
                };
<<<<<<< HEAD
                return db.collection("users").findOneAndUpdate({ clerkId }, { $set: update }, { returnDocument: "after" });
=======
                return db.collection(UserModel_1.USERS_COLLECTION).findOneAndUpdate({ clerkId }, { $set: update }, { returnDocument: "after" });
>>>>>>> 4410ea2acdac28177a285241b07c4a11c5962382
            }
            return { value: existingUser };
        }
        else {
            // Create new user
            const newUser = Object.assign(Object.assign({ clerkId }, (avatarId ? { avatarId } : {})), { createdAt: now, updatedAt: now });
<<<<<<< HEAD
            yield db.collection("users").insertOne(newUser);
=======
            yield db.collection(UserModel_1.USERS_COLLECTION).insertOne(newUser);
>>>>>>> 4410ea2acdac28177a285241b07c4a11c5962382
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
