// Extra word info from Gemini, cached in SQLite. Cached rows are always used first (works offline
// and without a key).
import { GEMINI_MODEL, fetchSentenceInfo, fetchWordInfo, translateText } from './gemini.js'
import { query, run } from './db.js'
import { geminiKey, getSetting } from './settings.js'

const inflight = new Map()

async function readCache(word) {
  const rows = await query('SELECT data FROM ai_info WHERE word = ?', [word])
  return rows[0] ? JSON.parse(rows[0].data) : null
}

const writeCache = (word, info) =>
  run('INSERT OR REPLACE INTO ai_info (word, data, model, created_at) VALUES (?, ?, ?, ?)', [word, JSON.stringify(info), GEMINI_MODEL, Date.now()])

// Simplified and traditional views of a word are cached separately (their examples use different
// characters). Simplified rows keep the plain word as key, as before.
const cacheKey = (ctx) => (ctx.script === 'trad' ? `trad:${ctx.word}` : ctx.word)

/** Cached info only, never touches the network. */
export const getCachedAiInfo = (ctx) => readCache(cacheKey(ctx)).catch(() => null)

// The key ref may still be loading from SQLite when the first detail screen opens.
const currentKey = async () => geminiKey.value || (await getSetting('gemini_key').catch(() => null))

/** Whether getAiInfo may call Gemini for an uncached word right now. */
export const canFetchAiInfo = async () => navigator.onLine !== false && !!(await currentKey())

/** ctx: { word, pinyin, meanings, script } → info, or null without a key / offline. Rejects when the call fails. */
export function getAiInfo(ctx) {
  const word = cacheKey(ctx)
  if (inflight.has(word)) return inflight.get(word)
  const p = (async () => {
    try {
      const cached = await readCache(word).catch(() => null)
      if (cached) return cached
      const key = await currentKey()
      if (!key || navigator.onLine === false) return null
      const info = await fetchWordInfo(ctx, key)
      await writeCache(word, info).catch((e) => console.debug('AI info cache write failed', e))
      return info
    } finally {
      inflight.delete(word)
    }
  })()
  inflight.set(word, p)
  return p
}

/** Multi-line error report shown in the AI zone. */
export function errorLog(e) {
  return [
    new Date().toLocaleTimeString('vi-VN'),
    e?.reason ? `Lỗi: ${e.reason}` : null,
    e?.message,
    e?.cause ? `Nguyên nhân: ${e.cause.message || e.cause}` : null,
    e?.detail || null,
  ].filter(Boolean).join('\n')
}

const requireKey = async () => {
  const key = await currentKey()
  if (!key) throw Object.assign(new Error('No Gemini key'), { reason: 'chưa có Gemini key' })
  return key
}

/** Always calls Gemini and overwrites the cache. Throws on any failure (the cache is left as is). */
export async function refreshAiInfo(ctx) {
  const key = await requireKey()
  const info = await fetchWordInfo(ctx, key)
  await writeCache(cacheKey(ctx), info)
  return info
}

// Free-text sentences that are not in the dictionary: translated and broken down by Gemini,
// cached per exact text. There is no local data to fall back to, so failures are reported.
export const hasGeminiKey = async () => !!(await currentKey())

export async function getCachedSentenceInfo(text) {
  const rows = await query('SELECT data FROM sentence_ai WHERE text = ?', [text]).catch(() => [])
  return rows[0] ? JSON.parse(rows[0].data) : null
}

/** Always calls Gemini and overwrites the cache. Throws on any failure. */
export async function fetchSentence(text) {
  const info = await fetchSentenceInfo(text, await requireKey())
  await run('INSERT OR REPLACE INTO sentence_ai (text, data, model, created_at) VALUES (?, ?, ?, ?)', [text, JSON.stringify(info), GEMINI_MODEL, Date.now()])
    .catch((e) => console.debug('Sentence cache write failed', e))
  return info
}

// Quick translations are cached in memory only, for the current session.
const translations = new Map()

/** text, { traditional } → { source: 'zh' | 'vi', text, pinyin }. Throws on any failure. */
export async function translate(text, opts) {
  const k = JSON.stringify([text, !!opts.traditional])
  if (translations.has(k)) return translations.get(k)
  const out = await translateText(text, opts, await requireKey())
  translations.set(k, out)
  return out
}
