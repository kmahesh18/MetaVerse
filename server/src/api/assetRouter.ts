import { Router } from "express";
import { getAssetById, getAssets } from "../services/assetService";
import { ObjectId } from "mongodb";

export const assetRouter = Router();

// Get all avatars
assetRouter.get("/", async (_req, res) => {
  try {
    const assets = await getAssets();
    res.json(assets);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Get avatar by ID
assetRouter.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid asset ID format" });
    }
    
    const asset = await getAssetById(id);
    
    if (!asset) {
      return res.status(404).json({ error: "Asset not found" });
    }
    
    res.json(asset);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});
