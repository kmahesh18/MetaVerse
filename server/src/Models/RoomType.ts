import { ObjectId, Document } from "mongodb";

interface asset {
  assetid: string;
  posX: number;
  posY: number;
}
export interface IRoomType extends Document {
  _id?: string | ObjectId; //UUID
  assets: asset[];
}

export const RoomType_Collection = "roomtypes";

export default { RoomType_Collection };
