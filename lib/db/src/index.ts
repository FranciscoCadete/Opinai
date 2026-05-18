import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

declare global {
  // eslint-disable-next-line no-var
  var __op1na1_pool: pg.Pool | undefined;
}

function getPool(): pg.Pool {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL must be set. Did you forget to provision a database?",
    );
  }
  if (!globalThis.__op1na1_pool) {
    globalThis.__op1na1_pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      idleTimeoutMillis: 30_000,
    });
  }
  return globalThis.__op1na1_pool;
}

export const pool: pg.Pool = new Proxy({} as pg.Pool, {
  get(_target, prop) {
    return Reflect.get(getPool(), prop);
  },
});

export const db: NodePgDatabase<typeof schema> = drizzle(pool, { schema });

export * from "./schema";
