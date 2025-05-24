"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Client = void 0;
const ws_1 = require("ws");
class Client {
    constructor(id, ws) {
        this.id = id; // This is the temporary connection ID
        this.ws = ws;
        this.roomId = null;
        this.spaceId = null;
        this.userId = null; // Starts as null
        this.isAuthenticated = false; // Starts as false
        console.log("Clientid:", id);
    }
    sendToSelf(message) {
        if (this.ws.readyState === ws_1.WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        }
    }
}
exports.Client = Client;
