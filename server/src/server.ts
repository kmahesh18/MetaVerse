import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./db";
import { userRouter } from "./api/userRouter";
import { assetRouter } from "./api/assetRouter";
import { roomRouter } from "./api/roomRouter";
import { spacesRouter } from "./api/spacesRouter";
import { roomTypesRouter } from "./api/roomTypesRouter";
import http from "http";
import { startWebsocketServer } from "./handlers/wsHandler";
import { createMediasoupWorker } from "./mediasoup/setup";


async function main(){
  dotenv.config();
  
  await createMediasoupWorker();
  const app = express();
  const server = http.createServer(app);
  
  // Attach WS to the HTTP server
  startWebsocketServer(server);
  
  // ✅ ENHANCED: CORS configuration for production
  const corsOptions = {
    origin: [
      process.env.CLIENT_URL || "http://localhost:5173",
      process.env.FRONTEND_URL || "http://localhost:5173", 
      "http://localhost:5173",
      "http://localhost:3000",
      "http://localhost:5001",
      "https://metaverse-three-indol.vercel.app",
      "https://localhost:5173",
      // Allow any localhost for development
      /^http:\/\/localhost:\d+$/,
      /^https:\/\/localhost:\d+$/
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: [
      'Content-Type', 
      'Authorization', 
      'X-Requested-With',
      'Accept',
      'Origin'
    ],
    exposedHeaders: ['Content-Length', 'X-Foo', 'X-Bar'],
    optionsSuccessStatus: 200 // For legacy browser support
  };
  
  // Enable preflight for all routes
  app.use(cors(corsOptions));
  app.options('*', cors(corsOptions));
  
  app.use(express.json());
  
  // ✅ ADD: Health check for WebSocket
  app.get("/ws-health", (req, res) => {
    res.json({ 
      status: "WebSocket server running",
      timestamp: new Date().toISOString(),
      cors: "enabled"
    });
  });
  
  // API routes
  app.use("/api/user", userRouter);
  app.use("/api/assets", assetRouter);
  app.use("/api/rooms", roomRouter);
  app.use("/api/spaces", spacesRouter);
  app.use("/api/roomtypes", roomTypesRouter);
  
  // Health check
  app.get("/", (_req, res) => res.send("Server running with CORS enabled"));
  
  const PORT = process.env.PORT || 5001;
  
  // Connect DB, then start *this* server
  connectDB()
    .then(() => {
      server.listen(PORT, () => {
        console.log(`🚀 HTTP + WS listening on http://localhost:${PORT}`);
        console.log(`🌐 CORS enabled for origins:`, corsOptions.origin);
      });
    })
    .catch((err) => {
      console.error("Failed to connect to database:", err);
      process.exit(1);
    });
}

main();