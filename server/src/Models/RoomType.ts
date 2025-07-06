import {  Document } from "mongodb";
import { IAsset } from "./AssetModel";

export interface IRoomType extends Document {
  name: string;
  description: string;
  id: string;
  assets: IAsset[];
}

export const RoomType_Collection = "roomtypes";

export default { RoomType_Collection };


//
