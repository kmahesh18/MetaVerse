import { ObjectId, Document } from "mongodb";

export interface ISpace extends Document {
  _id?: string | ObjectId;
  roomids: string[];
  adminid: string;
  currentuserids: string[];
  accesibleuserids: string[];
}

export const Space_Collection = "spaces";
export default { Space_Collection };
