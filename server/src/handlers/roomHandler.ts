import { Client } from "../classes/Client";
import { Message } from "../types/message.types";
import { JoinRoom } from "../services/userService";
import { LeaveRoom } from "../services/userService";

import { roomsById, playerPositions,Playerpos} from "../state/state"; 

import Room from "../classes/Room";

export function getOrCreateRoom(roomId: string): Room {
	let r = roomsById.get(roomId);
	if (!r) {
		r = new Room(roomId);
		roomsById.set(roomId, r);
	}
	return r;
}



export async function handleJoinRoom(client:Client,message:any){
  if (!client.userId) return; // Should not happen if isAuthenticated is true

				const { roomId } = message.payload;
				if (!client.spaceId) {
					return client.sendToSelf({
						type: "error",
						payload: "Must join a space before joining a room",
					});
				}

				// Handle room change if already in a room
				if (client.roomId) {
					const oldRoom = roomsById.get(client.roomId);
					if (oldRoom) {
						oldRoom.removeClient(client.id);
					}
				}

				// Join the new room using the authenticated userId
				await JoinRoom(client.userId, roomId); // Use client.userId
				client.roomId = roomId;

				// Get or create mediasoup room
				const msRoom = getOrCreateRoom(roomId);
				msRoom.addClient(client);
				msRoom.dataConsumers.set(client.id, []);
				client.sendToSelf({
					type: "joinedRoom", // CHANGE FROM "joinRoom" to match RoomResponseMessage
					payload: { roomId },
				});
}

export async function handleLeaveRoom(client:Client,message:any){
 	if (!client.userId) return;

				const { roomId } = message.payload;
				if (client.roomId !== roomId) {
					return client.sendToSelf({
						type: "error",
						payload: `Not in room ${roomId}`,
					});
				}

				await LeaveRoom(client.userId); // Use client.userId
				client.roomId = null;

				const msRoom = roomsById.get(roomId);
				if (msRoom) {
					msRoom.removeClient(client.id);
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

