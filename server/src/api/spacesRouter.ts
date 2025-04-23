import { Router } from "express";

export const spacesRouter = Router();

// Get all spaces for a user
spacesRouter.get("/", (_req, res) => {
  // Temporarily return an empty array until we implement spaces
  res.json([]);
});

// Create a new space
spacesRouter.post("/", (req, res) => {
  // Not implemented yet
  res.status(501).json({ message: "Not implemented yet" });
});

// Get space by ID
spacesRouter.get("/:id", (req, res) => {
  // Not implemented yet
  res.status(501).json({ message: "Not implemented yet", id: req.params.id });
});

// Update a space
spacesRouter.patch("/:id", (req, res) => {
  // Not implemented yet
  res.status(501).json({ message: "Not implemented yet", id: req.params.id });
}); 