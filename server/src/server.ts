import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./db";
import { userRouter } from "./api/userRouter";
import { assetRouter as assetRouter } from "./api/assetRouter";
import { roomRouter } from "./api/roomRouter";

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors({ origin: process.env.CLIENT_URL || "*", credentials: true }));
app.use(express.json());

// Routes
app.use("/api/user", userRouter);
app.use("/api/assets", assetRouter);
app.use("/api/rooms", roomRouter);

// Health check route
app.get("/", (_req, res) => res.send("Server running"));

const PORT = process.env.PORT || 5001;

// Connect to DB and start server
connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to connect to database:", err);
    process.exit(1);
  });
