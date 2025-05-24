import { Client } from "../classes/Client";
import { roomsById } from "../state/state"; 

export async function handlePlayerPosUpdate(client:Client,message:any){
  if (!client.userId || !client.roomId) {
					return client.sendToSelf({
						type: "error",
						payload: "Must be authenticated and in a room first",
					});
				}

				const { posX, posY } = message.payload;

				if (typeof posX !== "number" || typeof posY !== "number") {
					return client.sendToSelf({
						type: "error",
						payload: "Invalid position data",
					});
				}

				// Broadcast the updated position to other clients in the room
				const msRoom = roomsById.get(client.roomId);
				if (msRoom) {
					msRoom.broadcastMessage(client.id, {
						type: "broadcastPlayerPos",
						payload: {
							userId: client.userId,
							position: { x: posX, y: posY }
						},
					});
				}

}