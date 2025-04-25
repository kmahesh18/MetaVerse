import { ObjectId, Document } from "mongodb";

export interface ISpace extends Document {
  _id?: string;
  id: string; //room id by uuid
  roomids: string[];
  adminid: string;
  activeuserids: string[];
  accessibleuserids: string[];
}

export const Space_Collection = "spaces";
export default { Space_Collection };
