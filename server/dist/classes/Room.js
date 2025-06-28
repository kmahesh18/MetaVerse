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
        if (!client.userId) {
            throw new Error("Cannot add client without userId");
        }
        // Key by userId
        this.clients.set(client.userId, client);
        this.playerPositions.set(client.userId, { posX: 0, posY: 0 });
    }
    removeClient(client) {
        const uid = client.userId;
        if (!uid || !this.clients.has(uid)) {
            return false;
        }
        this.clients.delete(uid);
        this.playerPositions.delete(uid);
        return true;
    }
    getClient(clientId) {
        return this.clients.get(clientId);
    }
    broadcastMessage(senderId, message) {
        const json = JSON.stringify(message);
        this.clients.forEach((client) => {
            if ((senderId === null || client.userId !== senderId) &&
                client.ws.readyState === client.ws.OPEN) {
                client.ws.send(json);
                console.log(`broadcasted to ${client.userId}`, message);
            }
        });
    }
    sendToClient(clientId, message) {
        const client = this.clients.get(clientId);
        console.log(client);
        if (client && client.ws.readyState === client.ws.OPEN) {
            client.ws.send(JSON.stringify(message));
            console.log('msg sent');
        }
    }
    isEmpty() {
        return this.clients.size === 0;
    }
}
exports.Room = Room;
exports.default = Room;
