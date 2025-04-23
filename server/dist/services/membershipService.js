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
exports.addUserToSpace = addUserToSpace;
exports.removeUserFromSpace = removeUserFromSpace;
exports.addUserToRoom = addUserToRoom;
exports.removeUserFromRoom = removeUserFromRoom;
const User_1 = require("../models/User");
const Space_1 = require("../models/Space");
const Room_1 = require("../models/Room");
function addUserToSpace(userId, spaceId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const user = yield User_1.User.findById(userId);
            const space = yield Space_1.Space.findById(spaceId);
            if (!space) {
                throw new Error(`Space ${spaceId} not found`);
            }
            if (!user) {
                // Create temporary user if needed
                const tempUser = yield User_1.User.create({
                    name: `Visitor-${userId.substring(0, 5)}`,
                    email: `temp-${userId.substring(0, 8)}@example.com`,
                    password: "temporary",
                });
                userId = tempUser._id;
            }
            // Update user's space and add to activeUsers
            yield User_1.User.findByIdAndUpdate(userId, { spaceId });
            yield Space_1.Space.findByIdAndUpdate(spaceId, {
                $addToSet: { activeUsers: userId }
            });
            return User_1.User.findById(userId);
        }
        catch (error) {
            console.error('Error in addUserToSpace:', error);
            throw error;
        }
    });
}
function removeUserFromSpace(userId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const user = yield User_1.User.findById(userId);
            if (user === null || user === void 0 ? void 0 : user.spaceId) {
                yield Space_1.Space.findByIdAndUpdate(user.spaceId, {
                    $pull: { activeUsers: userId }
                });
            }
            return User_1.User.findByIdAndUpdate(userId, { $unset: { spaceId: 1 } }, { new: true });
        }
        catch (error) {
            console.error('Error in removeUserFromSpace:', error);
            throw error;
        }
    });
}
function addUserToRoom(userId, roomId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield User_1.User.findByIdAndUpdate(userId, { roomId });
            yield Room_1.Room.findByIdAndUpdate(roomId, {
                $addToSet: { users: userId }
            });
            return User_1.User.findById(userId);
        }
        catch (error) {
            console.error('Error in addUserToRoom:', error);
            throw error;
        }
    });
}
function removeUserFromRoom(userId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const user = yield User_1.User.findById(userId);
            if (user === null || user === void 0 ? void 0 : user.roomId) {
                yield Room_1.Room.findByIdAndUpdate(user.roomId, {
                    $pull: { users: userId }
                });
            }
            return User_1.User.findByIdAndUpdate(userId, { $unset: { roomId: 1 } }, { new: true });
        }
        catch (error) {
            console.error('Error in removeUserFromRoom:', error);
            throw error;
        }
    });
}
