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
exports.userRouter = void 0;
const express_1 = require("express");
const userService_1 = require("../services/userService");
const userService_2 = require("../services/userService");
const db_1 = require("../db");
const SpaceType_1 = require("../Models/SpaceType");
exports.userRouter = (0, express_1.Router)();
// Get all accessible spaces of a user
exports.userRouter.get("/:clerkId/spaces", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { clerkId } = req.params;
        const spaces = yield (0, userService_2.getAccessibleSpaces)(clerkId);
        if (spaces && spaces.length > 0) {
            res.json(spaces);
        }
        else {
            res.json([]); // Return empty array instead of 404
        }
    }
    catch (error) {
        console.log("Error getting spaces", error);
        res.status(500).json({ message: "Error retrieving spaces" });
    }
}));
// Get user by clerk ID
exports.userRouter.get("/:clerkId", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { clerkId } = req.params;
        const user = yield (0, userService_1.getUserByClerkId)(clerkId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.json(user);
    }
    catch (error) {
        console.error("Error getting user:", error);
        res.status(500).json({ message: "Error getting user" });
    }
}));
// Check if user has selected an avatar
exports.userRouter.get("/:clerkId/has-avatar", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const hasAvatar = yield (0, userService_1.hasSelectedAvatar)(req.params.clerkId);
        res.json({ hasAvatar });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
}));
// Create a new user
exports.userRouter.post("/", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { clerkId, avatarId, emailId } = req.body;
        if (!clerkId) {
            return res.status(400).json({ message: "Clerk ID is required" });
        }
        const result = yield (0, userService_1.createOrUpdateUser)(clerkId, avatarId, emailId);
        if (result && result.value) {
            res.status(201).json(result.value);
        }
        else {
            res.status(500).json({ message: "Failed to create user" });
        }
    }
    catch (error) {
        console.error("Error creating user:", error);
        res.status(500).json({ message: "Error creating user" });
    }
}));
// Create or update user
exports.userRouter.post("/:clerkId", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { clerkId } = req.params;
        const { avatarId } = req.body;
        const result = yield (0, userService_1.createOrUpdateUser)(clerkId, avatarId);
        if (result && result.value) {
            res.json(result.value);
        }
        else {
            res.status(500).json({ message: "Failed to update user" });
        }
    }
    catch (error) {
        console.error("Error updating user:", error);
        res.status(500).json({ message: "Error updating user" });
    }
}));
// Get spaces accessible to a user
exports.userRouter.get("/:clerkId/spaces", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { clerkId } = req.params;
        // Verify user exists
        const user = yield (0, userService_1.getUserByClerkId)(clerkId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        // Find all spaces where this user is in accessibleuserids
        const db = yield (0, db_1.getDB)();
        const spaces = yield db.collection(SpaceType_1.Space_Collection)
            .find({ accessibleuserids: clerkId })
            .toArray();
        res.json(spaces);
    }
    catch (error) {
        console.error("Error getting accessible spaces:", error);
        res.status(500).json({ message: "Error retrieving accessible spaces" });
    }
}));
// Update user avatar
exports.userRouter.patch("/:clerkId/avatar", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { clerkId } = req.params;
        const { avatarId } = req.body;
        if (!avatarId) {
            return res.status(400).json({ message: "Avatar ID is required" });
        }
        const result = yield (0, userService_1.createOrUpdateUser)(clerkId, avatarId);
        if (result) {
            res.json({ message: "Avatar updated successfully" });
        }
        else {
            res.status(500).json({ message: "Failed to update avatar" });
        }
    }
    catch (error) {
        console.error("Error updating avatar:", error);
        res.status(500).json({ message: "Error updating avatar" });
    }
}));
// Update a user
exports.userRouter.patch("/:clerkId", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { clerkId } = req.params;
        const { avatarId } = req.body;
        // Check if user exists
        const user = yield (0, userService_1.getUserByClerkId)(clerkId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        // Update user
        if (avatarId) {
            const result = yield (0, userService_1.createOrUpdateUser)(clerkId, avatarId);
            if (!result) {
                return res.status(500).json({ message: "Failed to update user" });
            }
        }
        res.json({ message: "User updated successfully" });
    }
    catch (error) {
        console.error("Error updating user:", error);
        res.status(500).json({ message: "Error updating user" });
    }
}));
