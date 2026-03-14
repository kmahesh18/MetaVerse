import mongoose, { Schema, type Document } from 'mongoose';

export interface AssetDocument extends Document {
  name: string;
  slug: string;
  category: string;
  spriteSheet: {
    url: string;
    frameWidth: number;
    frameHeight: number;
    frameCount: number;
  };
  thumbnailUrl: string;
  dimensions: {
    widthTiles: number;
    heightTiles: number;
  };
  defaultObstacle: boolean;
  defaultInteractive: boolean;
  defaultInteraction: string;
  tags: string[];
  isSystem: boolean;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const assetSchema = new Schema<AssetDocument>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    category: {
      type: String,
      required: true,
      validate: {
        validator: (v: string) =>
          ['tile', 'furniture', 'decoration', 'nature', 'tech', 'wall', 'character', 'effect'].includes(v),
        message: 'Invalid category',
      },
    },
    spriteSheet: {
      url: { type: String, required: true },
      frameWidth: { type: Number, default: 16 },
      frameHeight: { type: Number, default: 16 },
      frameCount: { type: Number, default: 1 },
    },
    thumbnailUrl: { type: String, default: '' },
    dimensions: {
      widthTiles: { type: Number, default: 1 },
      heightTiles: { type: Number, default: 1 },
    },
    defaultObstacle: { type: Boolean, default: false },
    defaultInteractive: { type: Boolean, default: false },
    defaultInteraction: { type: String, default: 'none' },
    tags: [{ type: String }],
    isSystem: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

assetSchema.index({ category: 1 });
assetSchema.index({ tags: 1 });
assetSchema.index({ slug: 1 });

export const Asset = mongoose.model<AssetDocument>('Asset', assetSchema);
