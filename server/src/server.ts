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

async function main() {
	dotenv.config();

	await createMediasoupWorker();
	const app = express();
	const server = http.createServer(app);

	// Attach WS to the HTTP server
	startWebsocketServer(server);

	// Middleware
	// Updated CORS configuration
	const corsOptions = {
		origin: [
			process.env.CLIENT_URL || "*",
			"https://meta-verse-pink.vercel.app", // Your deployed frontend
			"https://app.rurouni.tech",
			"http://localhost:5173", // Local development
			"http://localhost:3000",
			// Add any other frontend URLs you might use
		],
		credentials: true,
		optionsSuccessStatus: 200,
	};

	app.use(cors(corsOptions));
	app.use(express.json());

	// API routes
	app.use("/api/user", userRouter);
	app.use("/api/assets", assetRouter);
	app.use("/api/rooms", roomRouter);
	app.use("/api/spaces", spacesRouter);
	app.use("/api/roomtypes", roomTypesRouter);

	// Health check
	app.get("/", (_req, res) => res.send("Server running"));

	const PORT = process.env.PORT || 5001;

	// Connect DB, then start *this* server
	connectDB()
		.then(() => {
			server.listen(PORT, () => {
				console.log(`🚀 HTTP + WS listening on http://localhost:${PORT}`);
			});
		})
		.catch((err) => {
			console.error("Failed to connect to database:", err);
			process.exit(1);
		});
}

main();
