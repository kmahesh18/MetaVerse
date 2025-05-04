import { Client } from "./Client";
import * as mediasoup from "mediasoup";
import { Message } from "../types/message.types";

type PlayerPos={
  posX:number,
  posY:number
}
export class Room {
	id: string;
	clients: Map<string, Client>;
  
	//contains both producer and consumer tranposr objects mapped with the id 
	allTransportsById: Map<string, mediasoup.types.WebRtcTransport>;
	dataProducers: Map<string, mediasoup.types.DataProducer>; //client to room pipeline
	dataConsumers: Map<string, mediasoup.types.DataConsumer[]>; //room to subscribed client's pipelines
	playerPositions: Map<string, PlayerPos>; 
	constructor(roomId: string) {
		this.id = roomId;
		this.clients = new Map<string, Client>();
		this.playerPositions = new Map();
    this.allTransportsById = new Map();
		this.dataProducers = new Map();
		this.dataConsumers = new Map();
	}

	addClient(client: Client): void {
		this.clients.set(client.id, client);
		console.log(`Client ${client.id} added to room ${this.id}`);
	}

	removeClient(clientId: string): boolean {
		const client = this.clients.get(clientId);
		if (client) {
			this.clients.delete(clientId);
			console.log(`Client ${clientId} removed from room ${this.id}`);
			return true;
		}
		return false;
	}

	getClient(clientId: string): Client | undefined {
		return this.clients.get(clientId);
	}

	broadcastMessage(senderId: string | null, message: Message): void {
		const messageString = JSON.stringify(message);
		this.clients.forEach((client) => {
			if (
				(senderId === null || client.id !== senderId) &&
				client.ws.readyState === WebSocket.OPEN
			) {
				client.ws.send(messageString);
			}
		});
	}

	sendToClient(clientId: string, message: Message): void {
		const client = this.clients.get(clientId);
		if (client && client.ws.readyState === WebSocket.OPEN) {
			client.ws.send(JSON.stringify(message));
		}
	}

	isEmpty(): boolean {
		return this.clients.size === 0;
	}
}

export default  Room;