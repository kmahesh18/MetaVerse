"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Client = void 0;
class Client {
    constructor(id, ws) {
        this.id = id; // This is the temporary connection ID
        this.ws = ws;
        this.roomId = null;
        this.spaceId = null;
        this.userId = null; // Starts as null
        this.isAuthenticated = false; // Starts as false
    }
    sendToSelf(message) {
        if (this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        }
    }
}
exports.Client = Client;
