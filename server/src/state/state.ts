import Room from "../classes/Room";

export type Playerpos = {
  posX: number;
  posY: number;
}

export const roomsById = new Map<string, Room>();

// ✅ ADD: Helper function to get or create room
export function getOrCreateRoom(roomId: string): Room {
  let room = roomsById.get(roomId);
  if (!room) {
    console.log(`🏗️ Creating new room: ${roomId}`);
    room = new Room(roomId);
    roomsById.set(roomId, room);
  }
  return room;
}

// ✅ ADD: Helper function to cleanup empty rooms
export function cleanupEmptyRooms(): void {
  roomsById.forEach((room, roomId) => {
    if (room.isEmpty()) {
      console.log(`🧹 Cleaning up empty room: ${roomId}`);
      roomsById.delete(roomId);
    }
  });
}
