import Room from "../classes/Room";
export type Playerpos={
  posX: number;
  posY: number;
}
export const roomsById = new Map<string, Room>();
export const playerPositions:Map<string, Playerpos> =new Map();
