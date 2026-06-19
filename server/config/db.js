/**
 * Database abstraction layer supporting SQLite (local dev) and PostgreSQL (production).
 * Set DB_TYPE=pg and provide PG_* env vars to use PostgreSQL.
 */
import initSqlJs from 'sql.js'
import pkg from 'pg'
const { Pool } = pkg
import { mkdirSync, existsSync, readFileSync, writeFileSync, readdirSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

const DB_TYPE = process.env.DB_TYPE || 'sqlite'

/* ─────────────────────────────────────────────────────────────────────────────
   SQLite via sql.js (pure JS/WASM — no native compilation needed)
   ───────────────────────────────────────────────────────────────────────────── */
const dataDir = join(__dirname, '..', 'data')
if (DB_TYPE === 'sqlite' && !existsSync(dataDir)) mkdirSync(dataDir, { recursive: true })

const SQLITE_PATH = process.env.SQLITE_PATH || join(dataDir, 'aiexchange.db')
let sqliteDb = null
let SQL = null

async function initSqlite() {
  if (!SQL) {
    SQL = await initSqlJs()
  }
  if (!sqliteDb) {
    if (existsSync(SQLITE_PATH)) {
      const buffer = readFileSync(SQLITE_PATH)
      sqliteDb = new SQL.Database(buffer)
    } else {
      sqliteDb = new SQL.Database()
    }
    sqliteDb.run('PRAGMA journal_mode = WAL')
    sqliteDb.run('PRAGMA foreign_keys = ON')
  }
  return sqliteDb
}

function saveSqlite() {
  if (sqliteDb) {
    const data = sqliteDb.export()
    writeFileSync(SQLITE_PATH, Buffer.from(data))
  }
}

function getSqlite() {
  return sqliteDb
}

/* ─────────────────────────────────────────────────────────────────────────────
   PostgreSQL via pg
   ───────────────────────────────────────────────────────────────────────────── */
let pgPool = null

function getPgPool() {
  if (!pgPool) {
    const socketPath = process.env.PG_SOCKET_PATH
    const config = socketPath
      ? {
          user: process.env.PG_USER,
          password: process.env.PG_PASSWORD,
          database: process.env.PG_DATABASE,
          host: socketPath,
          max: 10,
          idleTimeoutMillis: 30000,
        }
      : {
          host: process.env.PG_HOST || '127.0.0.1',
          port: parseInt(process.env.PG_PORT || '5432', 10),
          user: process.env.PG_USER,
          password: process.env.PG_PASSWORD,
          database: process.env.PG_DATABASE,
          ssl: process.env.PG_SSL === 'false' ? false : { rejectUnauthorized: false },
          max: 10,
          idleTimeoutMillis: 30000,
        }
    pgPool = new Pool(config)
    console.log('[DB] PostgreSQL pool created')
  }
  return pgPool
}

/* ─────────────────────────────────────────────────────────────────────────────
   Parameter placeholder conversion: ? → $1, $2, ...
   ───────────────────────────────────────────────────────────────────────────── */
function convertPlaceholders(query) {
  let idx = 0
  return query.replace(/\?/g, () => `$${++idx}`)
}

/* ─────────────────────────────────────────────────────────────────────────────
   Unified API: all(), get(), run()
   ───────────────────────────────────────────────────────────────────────────── */

/**
 * Execute query and return all rows.
 * @param {string} query
 * @param {unknown[]} [params]
 * @returns {Promise<any[]>}
 */
export async function all(query, params = []) {
  if (DB_TYPE === 'sqlite') {
    const db = await initSqlite()
    const stmt = db.prepare(query)
    stmt.bind(params)
    const rows = []
    while (stmt.step()) {
      rows.push(stmt.getAsObject())
    }
    stmt.free()
    return rows
  }
  const pool = getPgPool()
  const pgQuery = convertPlaceholders(query)
  const result = await pool.query(pgQuery, params)
  return result.rows
}

/**
 * Execute query and return first row or undefined.
 * @param {string} query
 * @param {unknown[]} [params]
 * @returns {Promise<any>}
 */
export async function get(query, params = []) {
  if (DB_TYPE === 'sqlite') {
    const db = await initSqlite()
    const stmt = db.prepare(query)
    stmt.bind(params)
    let row
    if (stmt.step()) {
      row = stmt.getAsObject()
    }
    stmt.free()
    return row
  }
  const pool = getPgPool()
  const pgQuery = convertPlaceholders(query)
  const result = await pool.query(pgQuery, params)
  return result.rows[0]
}

/**
 * Execute INSERT/UPDATE/DELETE and return { changes, lastInsertRowid }.
 * @param {string} query
 * @param {unknown[]} [params]
 * @returns {Promise<{changes: number, lastInsertRowid?: number}>}
 */
export async function run(query, params = []) {
  if (DB_TYPE === 'sqlite') {
    const db = await initSqlite()
    db.run(query, params)
    const changes = db.getRowsModified()
    const lastInsertRowid = db.exec('SELECT last_insert_rowid() AS id')[0]?.values[0]?.[0]
    saveSqlite()
    return { changes, lastInsertRowid }
  }
  const pool = getPgPool()
  let pgQuery = convertPlaceholders(query)

  const isInsert = /^\s*INSERT\s+INTO/i.test(query)
  if (isInsert && !/RETURNING\s+id/i.test(query)) {
    pgQuery += ' RETURNING id'
  }

  const result = await pool.query(pgQuery, params)

  let lastInsertRowid
  if (isInsert && result.rows && result.rows.length > 0) {
    lastInsertRowid = result.rows[0].id
  }

  return {
    changes: result.rowCount ?? 0,
    lastInsertRowid,
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   Migrations
   Auto-discovers all *.sqlite.sql / *.pg.sql files in the migrations directory
   (sorted by filename), applies each once, records applied migrations in a
   _migrations tracking table so restarts are safe.
   ───────────────────────────────────────────────────────────────────────────── */
export async function runMigrations() {
  const migrationsDir = join(__dirname, '..', 'migrations')
  const ext = DB_TYPE === 'sqlite' ? '.sqlite.sql' : '.pg.sql'

  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(ext))
    .sort()

  if (DB_TYPE === 'sqlite') {
    const db = await initSqlite()

    db.exec(`CREATE TABLE IF NOT EXISTS _migrations (
      name TEXT PRIMARY KEY,
      appliedAt TEXT NOT NULL DEFAULT (datetime('now'))
    )`)

    const result = db.exec('SELECT name FROM _migrations')
    const applied = new Set(result[0]?.values.map((r) => r[0]) ?? [])

    for (const file of files) {
      if (applied.has(file)) continue
      const sqlContent = readFileSync(join(migrationsDir, file), 'utf8')
      try {
        db.exec(sqlContent)
      } catch (e) {
        // Column already exists (e.g. manually added) — safe to skip
        if (e.message && e.message.includes('duplicate column name')) {
          console.warn(`[DB] Migration ${file}: column already exists, marking as applied`)
        } else {
          throw e
        }
      }
      db.run('INSERT OR IGNORE INTO _migrations (name) VALUES (?)', [file])
      console.log(`[DB] Applied migration: ${file}`)
    }

    saveSqlite()
    console.log('[DB] SQLite migrations complete')
  } else {
    const pool = getPgPool()

    await pool.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        name VARCHAR(255) PRIMARY KEY,
        "appliedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)

    const { rows } = await pool.query('SELECT name FROM _migrations')
    const applied = new Set(rows.map((r) => r.name))

    for (const file of files) {
      if (applied.has(file)) continue
      const sqlContent = readFileSync(join(migrationsDir, file), 'utf8')
      try {
        await pool.query(sqlContent)
      } catch (e) {
        if (e.message && e.message.includes('already exists')) {
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
}

/* ─────────────────────────────────────────────────────────────────────────────
   Legacy export for direct SQLite access (avoid if possible)
   ───────────────────────────────────────────────────────────────────────────── */
export { getSqlite }
