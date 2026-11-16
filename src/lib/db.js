// Local SQLite store (bookmarks, Gemini cache, settings). Native SQLite on Android;
// on the web jeep-sqlite runs sql.js and persists the file to IndexedDB.
import { Capacitor } from '@capacitor/core'
import { CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite'

const NAME = 'cvdict'
const isWeb = Capacitor.getPlatform() === 'web'
const sqlite = new SQLiteConnection(CapacitorSQLite)

// Each entry upgrades the schema by one version (PRAGMA user_version).
const MIGRATIONS = [
  `CREATE TABLE IF NOT EXISTS bookmarks (word TEXT PRIMARY KEY, pinyin TEXT, def TEXT, created_at INTEGER);
   CREATE TABLE IF NOT EXISTS ai_info (word TEXT PRIMARY KEY, data TEXT NOT NULL, model TEXT, created_at INTEGER);
   CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);`,
  `CREATE TABLE IF NOT EXISTS sentence_ai (text TEXT PRIMARY KEY, data TEXT NOT NULL, model TEXT, created_at INTEGER);`,
]

async function initWeb() {
  const { defineCustomElements } = await import('jeep-sqlite/loader')
  defineCustomElements(window)
  const el = document.createElement('jeep-sqlite')
  el.setAttribute('wasmpath', `${import.meta.env.BASE_URL}assets`)
  el.style.display = 'none'
  document.body.appendChild(el)
  await customElements.whenDefined('jeep-sqlite')
  await sqlite.initWebStore()
}

async function open() {
  if (isWeb) await initWeb()
  const consistent = (await sqlite.checkConnectionsConsistency()).result
  const exists = (await sqlite.isConnection(NAME, false)).result
  const conn = consistent && exists
    ? await sqlite.retrieveConnection(NAME, false)
    : await sqlite.createConnection(NAME, false, 'no-encryption', 1, false)
  await conn.open()

  const version = (await conn.query('PRAGMA user_version')).values?.[0]?.user_version || 0
  for (let v = version; v < MIGRATIONS.length; v++) {
    await conn.execute(MIGRATIONS[v])
    await conn.execute(`PRAGMA user_version = ${v + 1}`, false)
  }
  if (isWeb) await sqlite.saveToStore(NAME)
  return conn
}

// A broken web store can hang instead of rejecting; give up so the app still starts.
const timeout = (ms) => new Promise((_, reject) => setTimeout(() => reject(new Error('SQLite init timed out')), ms))
export const dbReady = Promise.race([open(), timeout(10000)])

// Serialize all statements: the web store and the plugin bridge are not re-entrant.
let queue = dbReady.catch(() => {})
function enqueue(fn) {
  const p = queue.then(async () => fn(await dbReady))
  queue = p.catch(() => {})
  return p
}

/** SELECT → array of row objects. */
export const query = (sql, values = []) => enqueue(async (db) => (await db.query(sql, values)).values || [])

/** INSERT / UPDATE / DELETE; persisted to IndexedDB on the web. */
export const run = (sql, values = []) => enqueue(async (db) => {
  const r = await db.run(sql, values)
  if (isWeb) await sqlite.saveToStore(NAME)
  return r
})
