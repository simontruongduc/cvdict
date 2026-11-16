// Extra word info from Gemini, cached in SQLite. Cached rows are always used first (works offline
// and without a key); any failure resolves to null so the detail screen just shows local data.
import { GEMINI_MODEL, fetchWordInfo } from './gemini.js'
import { query, run } from './db.js'
import { geminiKey, getSetting } from './settings.js'

const inflight = new Map()

async function readCache(word) {
  const rows = await query('SELECT data FROM ai_info WHERE word = ?', [word])
  return rows[0] ? JSON.parse(rows[0].data) : null
}

/** Cached info only, never touches the network. */
export const getCachedAiInfo = (word) => readCache(word).catch(() => null)

// The key ref may still be loading from SQLite when the first detail screen opens.
const currentKey = async () => geminiKey.value || (await getSetting('gemini_key').catch(() => null))

/** Whether getAiInfo may call Gemini for an uncached word right now. */
export const canFetchAiInfo = async () => navigator.onLine !== false && !!(await currentKey())

/** ctx: { word, pinyin, meanings } → info | null */
export function getAiInfo(ctx) {
  const { word } = ctx
  if (inflight.has(word)) return inflight.get(word)
  const p = (async () => {
    try {
      const cached = await readCache(word).catch(() => null)
      if (cached) return cached
      const key = await currentKey()
      if (!key || navigator.onLine === false) return null
      const info = await fetchWordInfo(ctx, key)
      await run('INSERT OR REPLACE INTO ai_info (word, data, model, created_at) VALUES (?, ?, ?, ?)', [word, JSON.stringify(info), GEMINI_MODEL, Date.now()])
        .catch((e) => console.debug('AI info cache write failed', e))
      return info
    } catch (e) {
      console.debug('AI info unavailable for', word, e)
      return null
    } finally {
      inflight.delete(word)
    }
  })()
  inflight.set(word, p)
  return p
}
