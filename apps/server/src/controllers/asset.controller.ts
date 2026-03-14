import type { Response } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import { Asset } from '../models/Asset.js';

export async function getAssets(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { category, tag, search } = req.query;
    const filter: Record<string, unknown> = {};

    if (category) filter.category = category;
    if (tag) filter.tags = { $in: [tag] };
    if (search) filter.name = { $regex: search, $options: 'i' };

    const assets = await Asset.find(filter).sort({ category: 1, name: 1 });
    res.json(assets);
  } catch {
    res.status(500).json({ error: 'Failed to fetch assets' });
  }
}

export async function getAsset(req: AuthRequest, res: Response): Promise<void> {
  try {
    const asset = await Asset.findById(req.params.id);
    if (!asset) {
      res.status(404).json({ error: 'Asset not found' });
      return;
    }
    res.json(asset);
  } catch {
    res.status(500).json({ error: 'Failed to fetch asset' });
  }
}
