import { Client } from "../classes/Client";
import { JoinRoom } from "../services/userService";
import { LeaveRoom } from "../services/userService";
import { getNameByClerkId } from "../services/userService";
import { roomsById, Playerpos } from "../state/state";
import { getUserAvatarName } from "../services/userService";
import Room from "../classes/Room";
import { types } from "mediasoup";

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
        if ((producer as any).appData?.clientId === client.userId) {
          producer.close();
          oldRoom.dataProducers.delete(producerId);
          console.log(
            `Cleaned up old DataProducer ${producerId} for client ${client.userId}`,
          );
        }
      });
    }
  }

  // Join the new room
  await JoinRoom(client, roomId);
  const msRoom = getOrCreateRoom(roomId);
  if (!msRoom.clients.has(client.userId)) {
    msRoom.addClient(client);
  }
  msRoom.dataConsumers.set(client.userId, []);

  client.sendToSelf({
    type: "JoinedRoom",
    payload: {
      roomId,
      clientId: client.userId,
    },
  });


  // }, 2000);
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
    msRoom.broadcastMessage(client.userId, {
      type: "leftRoom",
      payload: { roomId: roomId, userId: client.userId },
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

export async function handleChatMessage(
  client: Client,
  message: any,
): Promise<void> {
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
  } catch (error) {
    console.error(`Error getting name for user ${client.userId}:`, error);
    senderName = "bot"; // Fallback name
  }

  // Broadcast the message to all clients in the room
  room.broadcastMessage(null, {
    type: "publicChat",
    payload: {
      senderId: client.userId,
      senderName: senderName || "bot", // Ensure we have a string value
      message: text,
      timestamp: Date.now(),
    },
  });
}

export async function handleProximityChat(
  client: Client,
  message: any,
): Promise<void> {
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
  const senderPos = room.playerPositions.get(client.userId);
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
    if (otherClientId === client.userId) return; // Skip sender

    const otherPos = room.playerPositions.get(otherClientId);
    if (!otherPos) return;

    // Calculate distance between players
    const distance = Math.sqrt(
      Math.pow(senderPos.posX - otherPos.posX, 2) +
        Math.pow(senderPos.posY - otherPos.posY, 2),
    );

    if (distance <= chatRadius) {
      nearbyClients.push(otherClientId);
    }
  });

  // Send message to nearby clients (including sender for confirmation)
  const chatMessage = {
    type: "proximityChat",
    payload: {
      senderId: client.userId,
      senderName: senderName || "bot",
      message: text,
      timestamp: Date.now(),
      chatRadius,
      senderPosition: senderPos,
    },
  };

  // Send to sender (for confirmation)
  client.sendToSelf(chatMessage);

  // Send to nearby clients
  nearbyClients.forEach((clientId) => {
    const targetClient = room.getClient(clientId);
    if (targetClient) {
      targetClient.sendToSelf(chatMessage);
    }
  });
  client.sendToSelf({
    type: "proximityChatInfo",
    payload: {
      recipientCount: nearbyClients.length,
      radius: chatRadius,
    },
  });
}
