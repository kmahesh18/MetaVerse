import {Message} from "../../types/message.types";

class Client {
	id: string; // Unique ID for this specific connection instance
	ws: WebSocket;
	roomId: string | null;
	spaceId: string | null; // Track which space the client is in
	userId: string | null; // The actual User ID from your database
	isAuthenticated: boolean; // Flag to check if user ID has been validated

	constructor(id: string, ws: WebSocket) {
		this.id = id; // This is the temporary connection ID
		this.ws = ws;
		this.roomId = null;
		this.spaceId = null;
		this.userId = null; // Starts as null
		this.isAuthenticated = false; // Starts as false
	}

	sendToSelf(message: Message): void {
		if (this.ws.readyState === WebSocket.OPEN) {
			this.ws.send(JSON.stringify(message));
		}
	}
}
export default Client;