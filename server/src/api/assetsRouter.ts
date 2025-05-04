import { Router } from "express";
import { getAssets, getAssetById, getAvatarAssets } from "../services/assetService";

export const assetsRouter = Router();

// Get all assets
assetsRouter.get("/", async (req, res) => {
  try {
    const assets = await getAssets();
    res.json(assets);
  } catch (error: any) {
    console.error("GET /api/assets - Error:", error.message);
    res.status(500).json({ error: error.message || "Error fetching assets" });
  }
});

// Get only avatar assets
assetsRouter.get("/avatars", async (req, res) => {
  try {
    const avatarAssets = await getAvatarAssets();
    res.json(avatarAssets);
  } catch (error: any) {
    console.error("GET /api/assets/avatars - Error:", error.message);
    res.status(500).json({ error: error.message || "Error fetching avatar assets" });
  }
});

// Get asset by ID
assetsRouter.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const asset = await getAssetById(id);
    
    if (!asset) {
      return res.status(404).json({ error: "Asset not found" });
    }
    
    res.json(asset);
  } catch (error: any) {
    console.error(`GET /api/assets/${req.params.id} - Error:`, error.message);
    res.status(500).json({ error: error.message || "Error fetching asset" });
  }
});
