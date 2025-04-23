import { Router } from "express";
import { getUserByClerkId, createOrUpdateUser, hasSelectedAvatar } from "../services/userService";
import { getAssetById } from "../services/assetService";
import { ObjectId } from "mongodb";

export const userRouter = Router();

// Get user by Clerk ID
userRouter.get("/:clerkId", async (req, res) => {
  try {
    const user = await getUserByClerkId(req.params.clerkId);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Check if user has selected an avatar
userRouter.get("/:clerkId/has-avatar", async (req, res) => {
  try {
    const hasAvatar = await hasSelectedAvatar(req.params.clerkId);
    res.json({ hasAvatar });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Create or update user
userRouter.post("/", async (req, res) => {
  try {
    const { clerkId, avatarId } = req.body;
    
    // Validate request
    if (!clerkId) {
      return res.status(400).json({ error: "clerkId is required" });
    }
    
    // Validate avatarId if provided
    if (avatarId) {
      if (!ObjectId.isValid(avatarId)) {
        return res.status(400).json({ error: "Invalid avatar ID format" });
      }
      
      const avatar = await getAssetById(avatarId);
      if (!avatar) {
        return res.status(404).json({ error: "Avatar not found" });
      }
    }
    
    const result = await createOrUpdateUser(clerkId, avatarId);
    if (result) {
      res.json(result.value || result);
    } else {
      res.status(500).json({ error: "Failed to create or update user" });
    }
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Update user avatar
userRouter.patch("/:clerkId/avatar", async (req, res) => {
  try {
    const { avatarId } = req.body;
    const { clerkId } = req.params;
    
    if (!avatarId) {
      return res.status(400).json({ error: "avatarId is required" });
    }
    
    if (!ObjectId.isValid(avatarId)) {
      return res.status(400).json({ error: "Invalid avatar ID format" });
    }
    
    const avatar = await getAssetById(avatarId);
    if (!avatar) {
      return res.status(404).json({ error: "Avatar not found" });
    }
    
    const result = await createOrUpdateUser(clerkId, avatarId);
    if (result) {
      res.json(result.value || result);
    } else {
      res.status(500).json({ error: "Failed to update user avatar" });
    }
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});
