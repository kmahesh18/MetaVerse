import * as mediasoup from "mediasoup"
import { WebSocket } from "ws";
export class Client {
	id: string; // Unique ID for this specific connection instance
	ws: WebSocket;
	roomId: string | null;
	spaceId: string | null; // Track which space the client is in
	userId: string | null; // The actual User ID from your database
	isAuthenticated: boolean; // Flag to check if user ID has been validated
	sendTransportId?:string; //store transport id of pipeline  to send data to server
  recvTransportId?:string //transport id of pipeline for receiving data from server
  rtpCapabilites?:mediasoup.types.RtpCapabilities
	constructor(id: string,userId:string, ws: WebSocket) {
		this.id = id; // This is the temporary connection ID
		this.ws = ws;
    this.userId = userId;
		this.roomId = null;
		this.spaceId = null;// Starts as null
		this.isAuthenticated = false; // Starts as false
    console.log("UserId:", userId);
	}

	sendToSelf(message:any): void {
		if (this.ws.readyState === WebSocket.OPEN) {
			this.ws.send(JSON.stringify(message));
      console.log("sent the msg");
		}
	}
}
