import { ObjectId } from "mongodb";
import { getDB } from "../db";
import { IAsset, ASSET_COLLECTION } from "../Models/AssetModel";

export async function getAssets(): Promise<IAsset[]> {
  const db = await getDB();
  return db.collection(ASSET_COLLECTION).find({}).toArray() as unknown as IAsset[];
}

export async function getAssetById(id: string): Promise<IAsset | null> {
  if (!ObjectId.isValid(id)) {
    throw new Error("Invalid asset ID format");
  }
  
  const db = await getDB();
  return db.collection(ASSET_COLLECTION).findOne({ _id: new ObjectId(id) }) as unknown as IAsset | null;
}

// Fetch avatar assets for avatar selection
export async function getAvatarAssets(): Promise<IAsset[]> {
  try {
    const db = await getDB();
    const avatars=await db
      .collection(ASSET_COLLECTION)
      .find({
        assetId: { $in: ["ch1_idle", "ch2_idle", "ch3_idle", "ch4_idle"] }
      })
      .toArray() as unknown as IAsset[];
      console.log(avatars)
    return avatars;
  } catch (error) {
    console.error("Error fetching avatar assets:", error);
    throw new Error(`Failed to fetch avatar assets: ${error}`);
  }
}