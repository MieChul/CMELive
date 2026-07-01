/**
 * Database layer — PostgreSQL only.
 * Local dev: set PG_HOST, PG_USER, PG_PASSWORD, PG_DATABASE in .env (or use Docker).
 * Production (GCP Cloud Run): set PG_SOCKET_PATH for Cloud SQL Unix socket.
 */
import pkg from 'pg'
const { Pool } = pkg
import { readFileSync, readdirSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

let pgPool = null

function getPool() {
  if (!pgPool) {
    const socketPath = process.env.PG_SOCKET_PATH
    const config = socketPath
      ? {
          user:     process.env.PG_USER,
          password: process.env.PG_PASSWORD,
          database: process.env.PG_DATABASE,
          host:     socketPath,
          max: 10,
          idleTimeoutMillis: 30000,
        }
      : {
          host:     process.env.PG_HOST || '127.0.0.1',
          port:     parseInt(process.env.PG_PORT || '5432', 10),
          user:     process.env.PG_USER,
          password: process.env.PG_PASSWORD,
          database: process.env.PG_DATABASE,
          ssl:      process.env.PG_SSL === 'false' ? false : { rejectUnauthorized: true },
          max: 10,
          idleTimeoutMillis: 30000,
        }
    pgPool = new Pool(config)
    console.log('[DB] PostgreSQL pool created')
  }
  return pgPool
}

function convertPlaceholders(query) {
  let idx = 0
  return query.replace(/\?/g, () => `$${++idx}`)
}

/**
 * Execute query and return all rows.
 */
export async function all(query, params = []) {
  const result = await getPool().query(convertPlaceholders(query), params)
  return result.rows
}

/**
 * Execute query and return first row or undefined.
 */
export async function get(query, params = []) {
  const result = await getPool().query(convertPlaceholders(query), params)
  return result.rows[0]
}

/**
 * Execute INSERT/UPDATE/DELETE and return { changes, lastInsertRowid }.
 */
export async function run(query, params = []) {
  let pgQuery = convertPlaceholders(query)
  const isInsert = /^\s*INSERT\s+INTO/i.test(query)
  if (isInsert && !/RETURNING\s+id/i.test(query)) {
    pgQuery += ' RETURNING id'
  }
  const result = await getPool().query(pgQuery, params)
  return {
    changes: result.rowCount ?? 0,
    lastInsertRowid: isInsert ? result.rows[0]?.id : undefined,
  }
}

/**
 * Run all pending .pg.sql migrations in order.
 */
export async function runMigrations() {
  const migrationsDir = join(__dirname, '..', 'migrations')
  const pool = getPool()

  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name VARCHAR(255) PRIMARY KEY,
      "appliedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)

  const { rows } = await pool.query('SELECT name FROM _migrations')
  const applied = new Set(rows.map((r) => r.name))

  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.pg.sql'))
    .sort()

  for (const file of files) {
    if (applied.has(file)) continue
    const sqlContent = readFileSync(join(migrationsDir, file), 'utf8')
    try {
      await pool.query(sqlContent)
    } catch (e) {
      if (e.message?.includes('already exists')) {
        console.warn(`[DB] Migration ${file}: object already exists, marking as applied`)
      } else {
        throw e
      }
    }
    await pool.query('INSERT INTO _migrations (name) VALUES ($1) ON CONFLICT DO NOTHING', [file])
    console.log(`[DB] Applied migration: ${file}`)
  }

  console.log('[DB] PostgreSQL migrations complete')
}
