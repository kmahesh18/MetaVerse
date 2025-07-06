"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Client = void 0;
const ws_1 = require("ws");
class Client {
    constructor(id, userId, ws) {
        this.id = id; // This is the temporary connection ID
        this.ws = ws;
        this.userId = userId;
        this.roomId = null;
        this.spaceId = null; // Starts as null
        this.isAuthenticated = false; // Starts as false
        console.log("UserId:", userId);
    }
    sendToSelf(message) {
        if (this.ws.readyState === ws_1.WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
            console.log("sent the msg");
        }
    }
}
exports.Client = Client;
