import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI && process.env.NODE_ENV !== "test") {
  // Keep import/build safe; dbConnect throws a clearer runtime error when called.
}

type MongooseCache = { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };
const globalWithMongoose = globalThis as typeof globalThis & { mongooseCache?: MongooseCache };
const cache = globalWithMongoose.mongooseCache ?? { conn: null, promise: null };
globalWithMongoose.mongooseCache = cache;

export async function dbConnect() {
  if (!MONGODB_URI) throw new Error("Missing MONGODB_URI. Add your MongoDB Atlas connection string to environment variables.");
  if (cache.conn) return cache.conn;
  if (!cache.promise) {
    cache.promise = mongoose.connect(MONGODB_URI, {
      dbName: process.env.MONGODB_DB || undefined,
      serverSelectionTimeoutMS: 10_000,
      maxPoolSize: 10,
    });
  }
  try { cache.conn = await cache.promise; }
  catch (error) { cache.promise = null; throw error; }
  return cache.conn;
}
