
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./shared/schema";

let db: ReturnType<typeof drizzle> | null = null;

// Initialize database connection
if (process.env.DATABASE_URL) {
  try {
    const client = postgres(process.env.DATABASE_URL, {
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });
    
    db = drizzle(client, { schema });
    console.log("✅ Database connected successfully");
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    db = null;
  }
} else {
  console.warn("⚠️ DATABASE_URL not set, database features will be unavailable");
}

export { db };
