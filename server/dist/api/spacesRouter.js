"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.spacesRouter = void 0;
const express_1 = require("express");
exports.spacesRouter = (0, express_1.Router)();
// Get all spaces for a user
exports.spacesRouter.get("/", (_req, res) => {
    // Temporarily return an empty array until we implement spaces
    res.json([]);
});
// Create a new space
exports.spacesRouter.post("/", (req, res) => {
    // Not implemented yet
    res.status(501).json({ message: "Not implemented yet" });
});
// Get space by ID
exports.spacesRouter.get("/:id", (req, res) => {
    // Not implemented yet
    res.status(501).json({ message: "Not implemented yet", id: req.params.id });
});
// Update a space
exports.spacesRouter.patch("/:id", (req, res) => {
    // Not implemented yet
    res.status(501).json({ message: "Not implemented yet", id: req.params.id });
});
