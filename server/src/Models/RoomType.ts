import { ObjectId, Document } from "mongodb";
import { IAsset } from "./AssetModel";

export interface IRoomType extends Document {
  _id?: ObjectId;
  id: string;
  assets: IAsset[];
}

export const RoomType_Collection = "roomtypes";

export default { RoomType_Collection };
