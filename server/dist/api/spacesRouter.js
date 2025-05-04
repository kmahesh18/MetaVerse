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
exports.spacesRouter = void 0;
const express_1 = require("express");
const spaceServices_1 = require("../services/spaceServices");
exports.spacesRouter = (0, express_1.Router)();
// Create a new space
exports.spacesRouter.post("/", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { selectedRoomTypes, adminid } = req.body;
        if (!adminid || !selectedRoomTypes) {
            return res.status(400).json({ message: "Missing adminid or selectedRoomTypes" });
        }
        const spaceId = yield (0, spaceServices_1.createSpace)(adminid, selectedRoomTypes);
        // Return the ID of the created space
        res.status(201).json({ id: spaceId });
    }
    catch (error) {
        console.error("POST /api/spaces - Error:", error.message);
        // Send a generic error message, specific details logged server-side
        res.status(500).json({ message: error.message || "Error creating space" });
    }
}));
// Get space details by ID
exports.spacesRouter.get("/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const spaceId = req.params.id;
        const [adminId, accessibleUsers, activeUsers, roomIds] = yield Promise.all([
            (0, spaceServices_1.getAdminid)(spaceId),
            (0, spaceServices_1.getAccessibleUserids)(spaceId),
            (0, spaceServices_1.getActiveUserIds)(spaceId),
            (0, spaceServices_1.getRoomIds)(spaceId)
        ]);
        // Check if the space exists (e.g., by checking if adminId was found)
        if (!adminId) {
            return res.status(404).json({ message: "Space not found" });
        }
        res.json({
            id: spaceId,
            adminid: adminId,
            accessibleuserids: accessibleUsers,
            activeuserids: activeUsers,
            roomids: roomIds
        });
    }
    catch (error) {
        console.error(`GET /api/spaces/${req.params.id} - Error:`, error.message);
        res.status(500).json({ message: error.message || "Error retrieving space details" });
    }
}));
// Give user access to space (Invite)
exports.spacesRouter.post("/:id/access", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { adminId, emailId } = req.body;
        const spaceId = req.params.id;
        if (!adminId || !emailId || !spaceId) {
            return res.status(400).json({ message: "Missing required fields: adminId, emailId, spaceId" });
        }
        const invitedClerkId = yield (0, spaceServices_1.giveUserAccesToSpace)(adminId, spaceId, emailId);
        res.json({ message: "User invited successfully", clerkId: invitedClerkId });
    }
    catch (error) {
        console.error(`POST /api/spaces/${req.params.id}/access - Error:`, error.message);
        // Handle specific known errors from the service layer if needed
        if (error.message.includes("not the admin")) {
            return res.status(403).json({ message: "Admin privileges required to invite users." });
        }
        if (error.message.includes("not found")) {
            return res.status(404).json({ message: error.message }); // e.g., "User not found", "Space not found"
        }
        res.status(500).json({ message: error.message || "Error inviting user" });
    }
}));
// Join space (Mark user as active)
exports.spacesRouter.post("/:id/join", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { clerkId } = req.body;
        const spaceId = req.params.id;
        if (!clerkId || !spaceId) {
            return res.status(400).json({ message: "Missing required fields: clerkId, spaceId" });
        }
        const joinedClerkId = yield (0, spaceServices_1.joinSpace)(spaceId, clerkId);
        res.json({ message: "Joined space successfully", clerkId: joinedClerkId });
    }
    catch (error) {
        console.error(`POST /api/spaces/${req.params.id}/join - Error:`, error.message);
        if (error.message.includes("not found")) {
            return res.status(404).json({ message: error.message });
        }
        if (error.message.includes("does not have access")) {
            return res.status(403).json({ message: "User does not have access to this space." });
        }
        res.status(500).json({ message: error.message || "Error joining space" });
    }
}));
// Leave space (Mark user as inactive)
exports.spacesRouter.post("/:id/leave", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { clerkId } = req.body;
        const spaceId = req.params.id;
        if (!clerkId || !spaceId) {
            return res.status(400).json({ message: "Missing required fields: clerkId, spaceId" });
        }
        const leftClerkId = yield (0, spaceServices_1.LeaveSpace)(spaceId, clerkId);
        res.json({ message: "Left space successfully", clerkId: leftClerkId });
    }
    catch (error) {
        console.error(`POST /api/spaces/${req.params.id}/leave - Error:`, error.message);
        // Leaving is generally permissive, but log errors
        res.status(500).json({ message: error.message || "Error leaving space" });
    }
}));
// Get rooms in a space (Redundant? Space details already include roomIds)
// Consider removing if GET /:id provides sufficient info
exports.spacesRouter.get("/:id/rooms", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const spaceId = req.params.id;
        const roomIds = yield (0, spaceServices_1.getRoomIds)(spaceId);
        // Check if space exists implicitly by checking if getRoomIds returned null/undefined before array conversion
        // The service function now returns [], so check length or rely on GET /:id for existence check
        // A dedicated check might be better: const spaceExists = await getAdminid(spaceId);
        // if (!spaceExists) return res.status(404)... 
        res.json(roomIds); // Returns [] if space not found or has no rooms
    }
    catch (error) {
        console.error(`GET /api/spaces/${req.params.id}/rooms - Error:`, error.message);
        res.status(500).json({ message: error.message || "Error retrieving rooms" });
    }
}));
