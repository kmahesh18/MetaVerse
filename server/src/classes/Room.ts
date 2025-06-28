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
    try {
      if (!client.userId) {
        throw new Error("Cannot add client without userId");
      }
      
      console.log(`👤 Adding client ${client.userId} to room ${this.id}`);
      this.clients.set(client.userId, client);
      this.playerPositions.set(client.userId, { posX: 0, posY: 0 });
      
      console.log(`✅ Room ${this.id} now has ${this.clients.size} clients`);
    } catch (error) {
      console.error("❌ Error adding client to room:", error);
      throw error;
    }
  }
  
    removeClient(client: Client): boolean {
      try {
        const uid = client.userId;
        if (!uid || !this.clients.has(uid)) {
          console.warn(`⚠️ Attempt to remove non-existent client ${uid} from room ${this.id}`);
          return false;
        }
        
        this.clients.delete(uid);
        this.playerPositions.delete(uid);
        
        console.log(`👋 Removed client ${uid} from room ${this.id}. Remaining: ${this.clients.size}`);
        return true;
      } catch (error) {
        console.error("❌ Error removing client from room:", error);
        return false;
      }
  }

  getClient(clientId: string): Client | undefined {
    return this.clients.get(clientId);
  }

  broadcastMessage(senderId: string | null, message: any): void {
    try {
      const json = JSON.stringify(message);
      let sentCount = 0;
      
      this.clients.forEach((client) => {
        if (
          (senderId === null || client.userId !== senderId) &&
          client.ws.readyState === client.ws.OPEN
        ) {
          client.ws.send(json);
          sentCount++;
        }
      });
      
      console.log(`📡 Broadcasted message to ${sentCount} clients in room ${this.id}`);
    } catch (error) {
      console.error("❌ Error broadcasting message:", error);
    }
  }

  sendToClient(clientId: string, message: Message): void {
    try {
      const client = this.clients.get(clientId);
      if (client && client.ws.readyState === client.ws.OPEN) {
        client.ws.send(JSON.stringify(message));
        console.log(`📤 Message sent to client ${clientId}`);
      } else {
        console.warn(`⚠️ Cannot send message to client ${clientId} - not found or connection closed`);
      }
    } catch (error) {
      console.error("❌ Error sending message to client:", error);
    }
  }

  isEmpty(): boolean {
    return this.clients.size === 0;
  }
}

export default Room;

