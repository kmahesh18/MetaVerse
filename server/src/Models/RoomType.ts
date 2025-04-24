import { ObjectId, Document } from "mongodb";
import { IAsset } from "./AssetModel";

export interface IRoomType extends Document {
  _id?: string | ObjectId; //UUID
  assets: IAsset[];
}

export const RoomType_Collection = "roomtypes";

export default { RoomType_Collection };
