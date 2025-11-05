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
exports.connectDB = connectDB;
exports.getDB = getDB;
exports.closeDB = closeDB;
const mongodb_1 = require("mongodb");
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Load .env from root directory (parent of server folder)
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, "../../.env") });
let db;
let client;
function connectDB() {
    return __awaiter(this, void 0, void 0, function* () {
        if (db)
            return db;
        const uri = process.env.MONGODB_URI || "";
        client = new mongodb_1.MongoClient(uri, {
            ssl: true,
            tls: true,
            tlsAllowInvalidCertificates: false,
        });
        try {
            yield client.connect();
            db = client.db("metaverse");
            console.log("Connected to MongoDB");
            // Ping to confirm connection
            yield db.command({ ping: 1 });
            console.log("Database connection verified");
            return db;
        }
        catch (error) {
            console.error("Error connecting to database:", error);
            throw error;
        }
    });
}
function getDB() {
    return __awaiter(this, void 0, void 0, function* () {
        if (!db) {
            yield connectDB();
        }
        return db;
    });
}
function closeDB() {
    return __awaiter(this, void 0, void 0, function* () {
        if (client) {
            yield client.close();
            console.log("Database connection closed");
        }
    });
}
