import { WebSocketServer } from "ws";

const PORT = Number(process.env.WSPORT) || 8080;
const wss = new WebSocketServer({ port: PORT });
console.log(`WebSocket server is running on ws://localhost:${PORT}`);

export default wss;