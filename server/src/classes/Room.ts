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
  mediaConsumers: Map<string, mediasoup.types.Consumer[]>;
  mediaProducers: Map<string, mediasoup.types.Producer>;

  constructor(roomId: string) {
    this.id = roomId;
    this.clients = new Map();
    this.allTransportsById = new Map();
    this.dataProducers = new Map();
    this.dataConsumers = new Map();
    this.playerPositions = new Map();
    this.mediaConsumers = new Map();
    this.mediaProducers = new Map();
  }
  

  addClient(client: Client): void {
      if (!client.userId) {
        throw new Error("Cannot add client without userId");
      }
      // Key by userId
      this.clients.set(client.userId, client);
      this.playerPositions.set(client.userId, { posX: 0, posY: 0 });
    }
  
    removeClient(client: Client): boolean {
      const uid = client.userId;
      if (!uid || !this.clients.has(uid)) {
        return false;
      }
      this.clients.delete(uid);
      this.playerPositions.delete(uid);
      return true;
  }

  getClient(clientId: string): Client | undefined {
    return this.clients.get(clientId);
  }

  broadcastMessage(senderId: string | null, message: any): void {
    const json = JSON.stringify(message);
    this.clients.forEach((client) => {
      if (
        (senderId === null || client.userId !== senderId) &&
        client.ws.readyState === client.ws.OPEN
      ) {
        client.ws.send(json);
        console.log(`broadcasted to ${client.userId}`, message);
      }
    });
  }

  sendToClient(clientId: string, message: Message): void {
    const client = this.clients.get(clientId);
    console.log(client);
    if (client && client.ws.readyState === client.ws.OPEN) {
      client.ws.send(JSON.stringify(message));
      console.log('msg sent');
    }
  }

  isEmpty(): boolean {
    return this.clients.size === 0;
  }
}

export default Room;

