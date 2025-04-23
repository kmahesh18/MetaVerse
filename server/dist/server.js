"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const db_1 = require("./db");
const userRouter_1 = require("./api/userRouter");
const avatarRouter_1 = require("./api/avatarRouter");
<<<<<<< HEAD
const spacesRouter_1 = require("./api/spacesRouter");
=======
>>>>>>> 4410ea2acdac28177a285241b07c4a11c5962382
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
// Middleware
app.use((0, cors_1.default)({ origin: process.env.CLIENT_URL || "*", credentials: true }));
app.use(express_1.default.json());
// Routes
app.use("/api/users", userRouter_1.userRouter);
app.use("/api/avatars", avatarRouter_1.avatarRouter);
<<<<<<< HEAD
app.use("/api/spaces", spacesRouter_1.spacesRouter);
// Health check route
app.get("/", (_req, res) => res.send("Server running"));
const PORT = process.env.PORT || 8080;
=======
// Health check route
app.get("/", (_req, res) => res.send("Server running"));
const PORT = process.env.PORT || 5000;
>>>>>>> 4410ea2acdac28177a285241b07c4a11c5962382
// Connect to DB and start server
(0, db_1.connectDB)().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}).catch(err => {
    console.error("Failed to connect to database:", err);
    process.exit(1);
});
