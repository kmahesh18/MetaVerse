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
exports.spaceRouter = void 0;
const express_1 = require("express");
const spaceService_1 = require("../services/spaceService");
const membershipService_1 = require("../services/membershipService");
// Remove getUserById import from here if not used elsewhere in this file
// import{ getUserById } from "../services/userService";
exports.spaceRouter = (0, express_1.Router)();
exports.spaceRouter.post("/", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { companyId, name, numRooms = 1 } = req.body;
    const space = yield (0, spaceService_1.createSpace)(companyId, name, numRooms);
    res.status(201).json(space);
}));
exports.spaceRouter.get("/", (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const list = yield (0, spaceService_1.getSpaces)();
    res.json(list);
}));
exports.spaceRouter.get("/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const space = yield (0, spaceService_1.getSpaceById)(req.params.id);
    if (space)
        res.json(space);
    else
        res.status(404).send("Not found");
}));
exports.spaceRouter.put("/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const updated = yield (0, spaceService_1.updateSpace)(req.params.id, req.body);
    res.json(updated);
}));
exports.spaceRouter.delete("/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    yield (0, spaceService_1.deleteSpace)(req.params.id);
    res.status(204).end();
}));
exports.spaceRouter.post("/:id/join", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId } = req.body;
    const spaceId = req.params.id;
    if (!userId) {
        return res
            .status(400)
            .json({ error: "userId is required in the request body" });
    }
    try {
        // 1. Update the User record to set their spaceId
        // This function handles finding/creating the user and setting the spaceId
        const updatedUser = yield (0, membershipService_1.addUserToSpace)(userId, spaceId);
        if (!updatedUser) {
            // This might happen if the temporary user creation failed unexpectedly
            return res.status(500).json({ error: "Failed to add user to space" });
        }
        // 2. Get the details of the space (including rooms) to send back
        const space = yield (0, spaceService_1.getSpaceById)(spaceId, { include: { rooms: true } });
        if (!space) {
            // Although addUserToSpace might create a user, the space itself might not exist
            // Or maybe the user update happened but fetching the space failed.
            // It's good practice to keep this check.
            return res
                .status(404)
                .json({ error: `Space with ID ${spaceId} not found` });
        }
        // 3. Send the successful response
        console.log("Space rooms:", space.rooms); // Debugging log to inspect space.rooms
        res.json({
            success: true,
            spaceId: space.id, // Use the ID from the fetched space object
            rooms: Array.isArray(space.rooms) ? space.rooms.map((r) => r.id) : [],
        });
    }
    catch (error) {
        console.error(`Error joining space ${spaceId} for user ${userId}:`, error);
        // Send a generic error message or be more specific based on the error type
        res
            .status(500)
            .json({
            error: `An error occurred while joining the space: ${error.message}`,
        });
    }
}));
exports.spaceRouter.post("/:id/leave", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId } = req.body;
    try {
        yield (0, membershipService_1.removeUserFromSpace)(userId);
        res.json({ success: true });
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
}));
