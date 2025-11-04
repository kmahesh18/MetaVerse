"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const db_1 = require("./db");
const userRouter_1 = require("./api/userRouter");
const assetRouter_1 = require("./api/assetRouter");
const roomRouter_1 = require("./api/roomRouter");
const spacesRouter_1 = require("./api/spacesRouter");
const roomTypesRouter_1 = require("./api/roomTypesRouter");
const http_1 = __importDefault(require("http"));
const wsHandler_1 = require("./handlers/wsHandler");
const setup_1 = require("./mediasoup/setup");
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        dotenv_1.default.config();
        yield (0, setup_1.createMediasoupWorker)();
        const app = (0, express_1.default)();
        const server = http_1.default.createServer(app);
        // Attach WS to the HTTP server
        (0, wsHandler_1.startWebsocketServer)(server);
        // Middleware
        // Updated CORS configuration
        const corsOptions = {
            origin: [
                process.env.CLIENT_URL || "*",
                "https://meta-verse-pink.vercel.app", // Your deployed frontend
                "https://app.rurouni.tech",
                "http://localhost:5173", // Local development
                "http://localhost:3000", // Server URL
                "http://localhost:3001", // Docker client URL
                // Add any other frontend URLs you might use
            ],
            credentials: true,
            optionsSuccessStatus: 200,
        };
        app.use((0, cors_1.default)(corsOptions));
        app.use(express_1.default.json());
        // API routes
        app.use("/api/user", userRouter_1.userRouter);
        app.use("/api/assets", assetRouter_1.assetRouter);
        app.use("/api/rooms", roomRouter_1.roomRouter);
        app.use("/api/spaces", spacesRouter_1.spacesRouter);
        app.use("/api/roomtypes", roomTypesRouter_1.roomTypesRouter);
        // Health check
        app.get("/", (_req, res) => res.send("Server running"));
        const PORT = process.env.PORT || 5001;
        // Connect DB, then start *this* server
        (0, db_1.connectDB)()
            .then(() => {
            server.listen(PORT, () => {
                console.log(`🚀 HTTP + WS listening on http://localhost:${PORT}`);
            });
        })
            .catch((err) => {
            console.error("Failed to connect to database:", err);
            process.exit(1);
        });
    });
}
main();
