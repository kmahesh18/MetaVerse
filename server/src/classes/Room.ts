// Room.ts
import { Client } from "./Client";
import * as mediasoup from "mediasoup";
import { Message } from "../types/message.types";
type PlayerPos = { posX: number; posY: number };

export class Room {
  id: string;
  clients: Map<string, Client>;

  allTransportsById: Map<string, mediasoup.types.WebRtcTransport>; //transport used by streams to send or recieve data 
  dataProducers: Map<string, mediasoup.types.DataProducer>; //data stream to send data
  dataConsumers: Map<string, mediasoup.types.DataConsumer[]>;//data stream to recieve data
  playerPositions: Map<string, PlayerPos>; //client id -> pos

  constructor(roomId: string) {
    this.id = roomId;
    this.clients = new Map();
    this.allTransportsById = new Map();
    this.dataProducers = new Map();
    this.dataConsumers = new Map();
    this.playerPositions = new Map();
  }
  

  addClient(client: Client): void {
    this.clients.set(client.id, client);
    this.playerPositions.set(client.id, { posX: 0, posY: 0 });
    console.log(`Client ${client.id} added to room ${this.id}`);
  }

  removeClient(client: Client): boolean {
    if (!this.clients.has(client.id)) return false;
    this.clients.delete(client.id);
    this.playerPositions.delete(client.id);
    console.log(`Client ${client.id} removed from room ${this.id}`);
    return true;
  }

  getClient(clientId: string): Client | undefined {
    return this.clients.get(clientId);
  }

  broadcastMessage(senderId: string | null, message: any): void {
    const json = JSON.stringify(message);
    this.clients.forEach((client) => {
      if (
        (senderId === null || client.id !== senderId) &&
        client.ws.readyState === client.ws.OPEN
      ) {
        client.ws.send(json);
      }
    });
  }

  sendToClient(clientId: string, message: Message): void {
    const client = this.clients.get(clientId);
    if (client && client.ws.readyState === client.ws.OPEN) {
      client.ws.send(JSON.stringify(message));
    }
  }

  isEmpty(): boolean {
    return this.clients.size === 0;
  }
}

export default Room;
