import { Router } from "express";
import {
  getUserByClerkId,
  createOrUpdateUser,
  hasSelectedAvatar,
  getEmail,
} from "../services/userService";
import { getAccessibleSpaces } from "../services/userService";
import { getDB } from "../db";
import { Space_Collection } from "../Models/SpaceType";

export const userRouter = Router();

// Get all accessible spaces of a user
userRouter.get("/:clerkId/spaces", async (req, res) => {
  try {
    const { clerkId } = req.params;
    const spaces = await getAccessibleSpaces(clerkId);
    if (spaces && spaces.length > 0) {
      res.json(spaces);
    } else {
      res.json([]); // Return empty array instead of 404
    }
  } catch (error) {
    console.log("Error getting spaces", error);
    res.status(500).json({ message: "Error retrieving spaces" });
  }
});


// Get user by clerk ID
userRouter.get("/:clerkId", async (req, res) => {
  try {
    const { clerkId } = req.params;
    const user = await getUserByClerkId(clerkId);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    res.json(user);
  } catch (error) {
    console.error("Error getting user:", error);
    res.status(500).json({ message: "Error getting user" });
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

// Create a new user
userRouter.post("/", async (req, res) => {
  try {
    const { clerkId, avatarId ,emailId} = req.body;
    
    if (!clerkId) {
      return res.status(400).json({ message: "Clerk ID is required" });
    }
    
    const result = await createOrUpdateUser(clerkId, avatarId,emailId);
    
    if (result && result.value) {
      res.status(201).json(result.value);
    } else {
      res.status(500).json({ message: "Failed to create user" });
    }
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ message: "Error creating user" });
  }
});

// Create or update user
userRouter.post("/:clerkId", async (req, res) => {
  try {
    const { clerkId } = req.params;
    const { avatarId } = req.body;

    const result = await createOrUpdateUser(clerkId, avatarId);
    
    if (result && result.value) {
      res.json(result.value);
    } else {
      res.status(500).json({ message: "Failed to update user" });
    }
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ message: "Error updating user" });
  }
});

// Get spaces accessible to a user
userRouter.get("/:clerkId/spaces", async (req, res) => {
  try {
    const { clerkId } = req.params;
    
    // Verify user exists
    const user = await getUserByClerkId(clerkId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Find all spaces where this user is in accessibleuserids
    const db = await getDB();
    const spaces = await db.collection(Space_Collection)
      .find({ accessibleuserids: clerkId })
      .toArray();
    
    res.json(spaces);
  } catch (error) {
    console.error("Error getting accessible spaces:", error);
    res.status(500).json({ message: "Error retrieving accessible spaces" });
  }
});

// Update user avatar
userRouter.patch("/:clerkId/avatar", async (req, res) => {
  try {
    const { clerkId } = req.params;
    const { avatarId } = req.body;
    
    if (!avatarId) {
      return res.status(400).json({ message: "Avatar ID is required" });
    }
    
    const result = await createOrUpdateUser(clerkId, avatarId);
    
    if (result) {
      res.json({ message: "Avatar updated successfully" });
    } else {
      res.status(500).json({ message: "Failed to update avatar" });
    }
  } catch (error) {
    console.error("Error updating avatar:", error);
    res.status(500).json({ message: "Error updating avatar" });
  }
});

// Update a user
userRouter.patch("/:clerkId", async (req, res) => {
  try {
    const { clerkId } = req.params;
    const { avatarId } = req.body;
    
    // Check if user exists
    const user = await getUserByClerkId(clerkId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Update user
    if (avatarId) {
      const result = await createOrUpdateUser(clerkId, avatarId);
      if (!result) {
        return res.status(500).json({ message: "Failed to update user" });
      }
    }
    
    res.json({ message: "User updated successfully" });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ message: "Error updating user" });
  }
});


