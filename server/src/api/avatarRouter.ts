import { Router } from "express";
import { getAvatars, getAvatarById } from "../services/avatarService";
import { ObjectId } from "mongodb";

export const avatarRouter = Router();

// Get all avatars
avatarRouter.get("/", async (_req, res) => {
  try {
    const avatars = await getAvatars();
    res.json(avatars);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Get avatar by ID
avatarRouter.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid avatar ID format" });
    }
    
    const avatar = await getAvatarById(id);
    
    if (!avatar) {
      return res.status(404).json({ error: "Avatar not found" });
    }
    
    res.json(avatar);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});
