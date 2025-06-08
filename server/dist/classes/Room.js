"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Room = void 0;
class Room {
    constructor(roomId) {
        this.id = roomId;
        this.clients = new Map();
        this.allTransportsById = new Map();
        this.dataProducers = new Map();
        this.dataConsumers = new Map();
        this.playerPositions = new Map();
        this.mediaConsumers = new Map();
        this.mediaProducers = new Map();
    }
    addClient(client) {
        this.clients.set(client.id, client);
        this.playerPositions.set(client.id, { posX: 0, posY: 0 });
        console.log(`Client ${client.id} added to room ${this.id}`);
    }
    removeClient(client) {
        if (!this.clients.has(client.id))
            return false;
        this.clients.delete(client.id);
        this.playerPositions.delete(client.id);
        console.log(`Client ${client.id} removed from room ${this.id}`);
        return true;
    }
    getClient(clientId) {
        return this.clients.get(clientId);
    }
    broadcastMessage(senderId, message) {
        const json = JSON.stringify(message);
        this.clients.forEach((client) => {
            if ((senderId === null || client.id !== senderId) &&
                client.ws.readyState === client.ws.OPEN) {
                client.ws.send(json);
            }
        });
    }
    sendToClient(clientId, message) {
        const client = this.clients.get(clientId);
        if (client && client.ws.readyState === client.ws.OPEN) {
            client.ws.send(JSON.stringify(message));
        }
    }
    isEmpty() {
        return this.clients.size === 0;
    }
}
exports.Room = Room;
exports.default = Room;
