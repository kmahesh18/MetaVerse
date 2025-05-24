import { Client } from "../classes/Client";
import { JoinRoom } from "../services/userService";
import { LeaveRoom } from "../services/userService";

import { roomsById, Playerpos } from "../state/state";

import Room from "../classes/Room";

export function getOrCreateRoom(roomId: string): Room {
  let r = roomsById.get(roomId);
  if (!r) {
    r = new Room(roomId);
    roomsById.set(roomId, r);
  }
  return r;
}

function cleanupRoom(roomId: string) {
  const room = roomsById.get(roomId);
  if (room && room.isEmpty()) {
    roomsById.delete(roomId);
    console.log(`Room ${roomId} deleted (was empty)`);
  }
}

export async function handleJoinRoom(client: Client, message: any) {
  if (!client.userId) return;

  const { roomId } = message.payload;

  // Handle room change if already in a room
  if (client.roomId) {
    const oldRoom = roomsById.get(client.roomId);
    if (oldRoom) {
      oldRoom.removeClient(client);
      
      // ✅ CLEAN UP: Remove client's old DataProducers
      oldRoom.dataProducers.forEach((producer, producerId) => {
        if ((producer as any).appData?.clientId === client.id) {
          producer.close();
          oldRoom.dataProducers.delete(producerId);
          console.log(`Cleaned up old DataProducer ${producerId} for client ${client.id}`);
        }
      });
    }
  }

  // Join the new room
  await JoinRoom(client, roomId);
  const msRoom = getOrCreateRoom(roomId);
  if (!msRoom.clients.has(client.id)) {
    msRoom.addClient(client);
  }
  msRoom.dataConsumers.set(client.id, []);

  client.sendToSelf({
    type: "JoinedRoom",
    payload: { 
      roomId,
      clientId: client.id
    },
  });

  // ✅ CLEAN: Only get ACTIVE DataProducers (exclude client's own future producer)
  setTimeout(() => {
    const existingProducers = Array.from(msRoom.dataProducers.entries())
      .filter(([id, producer]) => {
        const ownerClientId = (producer as any).appData?.clientId;
        return ownerClientId && ownerClientId !== client.id; // Exclude own producer
      })
      .map(([id]) => id);
    
    console.log(`Client ${client.id} found ${existingProducers.length} existing producers:`, existingProducers);
    
    if (existingProducers.length > 0) {
      existingProducers.forEach(producerId => {
        client.sendToSelf({
          type: "newDataProducer",
          payload: { producerId }
        });
      });
    }
  }, 2000);

  return roomId;
}

export async function handleLeaveRoom(client: Client, message: any) {
  if (!client.userId) return;

  const { roomId } = message.payload;
  if (client.roomId !== roomId) {
    return client.sendToSelf({
      type: "error",
      payload: `Not in room ${roomId}`,
    });
  }

  await LeaveRoom(client, roomId); // Use client.userId
  client.roomId = null;

  const msRoom = roomsById.get(roomId);
  if (msRoom) {
    msRoom.removeClient(client);
    cleanupRoom(roomId);
    client.sendToSelf({
      type: "leftRoom",
      payload: { roomId },
    });
  } else {
    client.sendToSelf({
      type: "error",
      payload: `Room ${roomId} not found`,
    });
  }
}

export async function playerMovementUpdate(
  roomId: string,
  clientId: string,
  pos: Playerpos,
) {
  try {
    if (!roomId || !clientId || !pos) return false;
    const room = getOrCreateRoom(roomId);
    if (!room) return false;
    room.playerPositions.set(clientId, pos);
    console.log(room.playerPositions);
    return true;
  } catch (error) {
    console.log("error occured at playerMovementUpdate", error);
    return false;
  }
}
