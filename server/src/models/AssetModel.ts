import { Document, ObjectId } from "mongodb";

export interface IAsset extends Document {
    _id?: string | ObjectId; // UUID string or MongoDB ObjectId
    assetId: string;
    name: string;
    previewUrl: string;
    createdAt: Date;
}

// Collection name for reference
export const ASSET_COLLECTION = "assets";

// No schema definition needed with MongoDB
export default { ASSET_COLLECTION }; 