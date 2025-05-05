"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Room = void 0;
class Room {
    constructor(roomId) {
        this.id = roomId;
        this.clients = new Map();
        this.playerPositions = new Map();
        this.allTransportsById = new Map();
        this.dataProducers = new Map();
        this.dataConsumers = new Map();
    }
    addClient(client) {
        this.clients.set(client.id, client);
        console.log(`Client ${client.id} added to room ${this.id}`);
    }
    removeClient(clientId) {
        const client = this.clients.get(clientId);
        if (client) {
            this.clients.delete(clientId);
            console.log(`Client ${clientId} removed from room ${this.id}`);
            return true;
        }
        return false;
    }
    getClient(clientId) {
        return this.clients.get(clientId);
    }
    broadcastMessage(senderId, message) {
        const messageString = JSON.stringify(message);
        this.clients.forEach((client) => {
            if ((senderId === null || client.id !== senderId) &&
                client.ws.readyState === WebSocket.OPEN) {
                client.ws.send(messageString);
            }
        });
    }
    sendToClient(clientId, message) {
        const client = this.clients.get(clientId);
        if (client && client.ws.readyState === WebSocket.OPEN) {
            client.ws.send(JSON.stringify(message));
        }
    }
    isEmpty() {
        return this.clients.size === 0;
    }
}
exports.Room = Room;
exports.default = Room;
