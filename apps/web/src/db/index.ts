import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { drizzle as drizzleNode } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

type Db = NeonHttpDatabase<typeof schema>;

let dbInstance: Db | null = null;

export function getDb(): Db {
	if (!dbInstance) {
		if (!process.env.DATABASE_URL) {
			throw new Error("DATABASE_URL environment variable is required");
		}
		const url = process.env.DATABASE_URL;
		if (url.includes("localhost") || url.includes("127.0.0.1")) {
			const pool = new pg.Pool({ connectionString: url });
			dbInstance = drizzleNode(pool, { schema }) as unknown as Db;
		} else {
			const sql = neon(url);
			dbInstance = drizzleNeon(sql, { schema });
		}
	}
	return dbInstance;
}

// Lazy proxy that defers connection until first access (allows builds without DATABASE_URL)
export const db = new Proxy({} as Db, {
	get(_, prop) {
		const target = getDb();
		const value = Reflect.get(target, prop);
		return typeof value === "function" ? value.bind(target) : value;
	},
});
