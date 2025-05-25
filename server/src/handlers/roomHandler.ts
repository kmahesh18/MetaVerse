import { Client } from "../classes/Client";
import { JoinRoom } from "../services/userService";
import { LeaveRoom } from "../services/userService";
import { getNameByClerkId } from "../services/userService";
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


export async function handleChatMessage(client: Client, message: any): Promise<void> {
  if (!client.userId || !client.roomId) {
    return client.sendToSelf({
      type: "error",
      payload: "You must be in a room to send messages",
    });
  }

  const { text } = message.payload;
  
  if (!text || typeof text !== "string" || text.trim() === "") {
    return client.sendToSelf({
      type: "error",
      payload: "Message cannot be empty",
    });
  }

  const room = roomsById.get(client.roomId);
  if (!room) {
    return client.sendToSelf({
      type: "error",
      payload: "Room not found",
    });
  }

  // Get sender name with error handling
  let senderName;
  try {
    senderName = await getNameByClerkId(client.userId);
    console.log("jhvedcjehvdcjwhdvkje")
  } catch (error) {
    console.error(`Error getting name for user ${client.userId}:`, error);
    senderName = "bot"; // Fallback name
  }

  // Broadcast the message to all clients in the room
  room.broadcastMessage(null, {
    type: "publicChat",
    payload: {
      senderId: client.id,
      senderName: senderName || "bot", // Ensure we have a string value
      message: text,
      timestamp: Date.now()
    },
  });
}

export async function handleProximityChat(client: Client, message: any): Promise<void> {
  if (!client.userId || !client.roomId) {
    return client.sendToSelf({
      type: "error",
      payload: "You must be in a room to send proximity messages",
    });
  }

  const { text, chatRadius = 150 } = message.payload; // Default radius of 150 pixels
  
  if (!text || typeof text !== "string" || text.trim() === "") {
    return client.sendToSelf({
      type: "error",
      payload: "Message cannot be empty",
    });
  }

  const room = roomsById.get(client.roomId);
  if (!room) {
    return client.sendToSelf({
      type: "error",
      payload: "Room not found",
    });
  }

  // Get sender's position
  const senderPos = room.playerPositions.get(client.id);
  if (!senderPos) {
    return client.sendToSelf({
      type: "error",
      payload: "Your position not found",
    });
  }

  // Get sender name
  let senderName;
  try {
    senderName = await getNameByClerkId(client.userId);
  } catch (error) {
    console.error(`Error getting name for user ${client.userId}:`, error);
    senderName = "bot";
  }

  // Find clients within proximity radius
  const nearbyClients: string[] = [];
  
  room.clients.forEach((otherClient, otherClientId) => {
    if (otherClientId === client.id) return; // Skip sender
    
    const otherPos = room.playerPositions.get(otherClientId);
    if (!otherPos) return;
    
    // Calculate distance between players
    const distance = Math.sqrt(
      Math.pow(senderPos.posX - otherPos.posX, 2) + 
      Math.pow(senderPos.posY - otherPos.posY, 2)
    );
    
    console.log(`Distance between ${client.id} and ${otherClientId}: ${distance.toFixed(2)}`);
    
    if (distance <= chatRadius) {
      nearbyClients.push(otherClientId);
    }
  });

  console.log(`Client ${client.id} proximity chat to ${nearbyClients.length} nearby clients`);

  // Send message to nearby clients (including sender for confirmation)
  const chatMessage = {
    type: "proximityChat",
    payload: {
      senderId: client.id,
      senderName: senderName || "bot",
      message: text,
      timestamp: Date.now(),
      chatRadius,
      senderPosition: senderPos
    },
  };

  // Send to sender (for confirmation)
  client.sendToSelf(chatMessage);

  // Send to nearby clients
  nearbyClients.forEach(clientId => {
    const targetClient = room.getClient(clientId);
    if (targetClient) {
      targetClient.sendToSelf(chatMessage);
    }
  });
  client.sendToSelf({
    type: "proximityChatInfo",
    payload: {
      recipientCount: nearbyClients.length,
      radius: chatRadius
    }
  });
}