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
const avatarService_1 = require("../services/avatarService");
const mongodb_1 = require("mongodb");
exports.userRouter = (0, express_1.Router)();
// Get user by Clerk ID
exports.userRouter.get("/:clerkId", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = yield (0, userService_1.getUserByClerkId)(req.params.clerkId);
        if (!user)
            return res.status(404).json({ error: "User not found" });
        res.json(user);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
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
// Create or update user
exports.userRouter.post("/", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { clerkId, avatarId } = req.body;
        // Validate request
        if (!clerkId) {
            return res.status(400).json({ error: "clerkId is required" });
        }
        // Validate avatarId if provided
        if (avatarId) {
            if (!mongodb_1.ObjectId.isValid(avatarId)) {
                return res.status(400).json({ error: "Invalid avatar ID format" });
            }
            const avatar = yield (0, avatarService_1.getAvatarById)(avatarId);
            if (!avatar) {
                return res.status(404).json({ error: "Avatar not found" });
            }
        }
        const result = yield (0, userService_1.createOrUpdateUser)(clerkId, avatarId);
        if (result) {
            res.json(result.value || result);
        }
        else {
            res.status(500).json({ error: "Failed to create or update user" });
        }
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
}));
// Update user avatar
exports.userRouter.patch("/:clerkId/avatar", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { avatarId } = req.body;
        const { clerkId } = req.params;
        if (!avatarId) {
            return res.status(400).json({ error: "avatarId is required" });
        }
        if (!mongodb_1.ObjectId.isValid(avatarId)) {
            return res.status(400).json({ error: "Invalid avatar ID format" });
        }
        const avatar = yield (0, avatarService_1.getAvatarById)(avatarId);
        if (!avatar) {
            return res.status(404).json({ error: "Avatar not found" });
        }
        const result = yield (0, userService_1.createOrUpdateUser)(clerkId, avatarId);
        if (result) {
            res.json(result.value || result);
        }
        else {
            res.status(500).json({ error: "Failed to update user avatar" });
        }
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
}));
