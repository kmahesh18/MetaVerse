import { MongoClient, Db, ServerApiVersion } from "mongodb";
import dotenv from "dotenv";
import path from "path";

// Load .env from root directory (parent of server folder)
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

let db: Db;
let client: MongoClient;

export async function connectDB() {
  if (db) return db;

  const uri = process.env.MONGODB_URI || "";

  client = new MongoClient(uri, {
    ssl: true,
    tls: true,
    tlsAllowInvalidCertificates: false,
  });

  try {
    await client.connect();
    db = client.db("metaverse");
    console.log("Connected to MongoDB");

    // Ping to confirm connection
    await db.command({ ping: 1 });
    console.log("Database connection verified");

    return db;
  } catch (error) {
    console.error("Error connecting to database:", error);
    throw error;
  }
}

export async function getDB() {
  if (!db) {
    await connectDB();
  }
  return db;
}

export async function closeDB() {
  if (client) {
    await client.close();
    console.log("Database connection closed");
  }
}
