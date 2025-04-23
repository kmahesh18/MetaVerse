import { ObjectId } from "mongodb";
import { getDB } from "../db";
import { IAsset, ASSET_COLLECTION } from "../Models/AssetModel";

export async function getAssets(): Promise<IAsset[]> {
  const db = await getDB();
  return db.collection(ASSET_COLLECTION).find({}).toArray() as unknown as IAsset[];
}

export async function getAssetById(id: string): Promise<IAsset | null> {
  if (!ObjectId.isValid(id)) {
    throw new Error("Invalid avatar ID format");
  }
  
  const db = await getDB();
  return db.collection(ASSET_COLLECTION).findOne({ _id: new ObjectId(id) }) as unknown as IAsset | null;
}
