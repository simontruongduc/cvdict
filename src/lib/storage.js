// Search history (localStorage) and bookmarks (SQLite, falling back to localStorage if the DB fails).
import { ref, watch } from 'vue'
import { dbReady, query, run } from './db.js'

function persisted(key, fallback) {
  let initial = fallback
  try {
    const raw = localStorage.getItem(key)
    if (raw) initial = JSON.parse(raw)
  } catch {}
  const r = ref(initial)
  watch(r, (v) => {
    try { localStorage.setItem(key, JSON.stringify(v)) } catch {}
  }, { deep: true })
  return r
}

/** Items: { type: 'word', s, py } | { type: 'query', q } — newest first. */
export const history = persisted('cvdict.history', [])

const sameItem = (a, b) => a.type === b.type && (a.type === 'word' ? a.s === b.s : a.q === b.q)

export function pushHistory(item) {
  history.value = [item, ...history.value.filter((h) => !sameItem(h, item))].slice(0, 50)
}

export const removeHistory = (item) => { history.value = history.value.filter((h) => !sameItem(h, item)) }
export const clearHistory = () => { history.value = [] }

/** Bookmarks: { s, py, def } — newest first. */
export const saved = ref([])
let useDb = true

function legacySaved() {
  try { return JSON.parse(localStorage.getItem('cvdict.saved') || '[]') } catch { return [] }
}

async function loadSaved() {
  let rows = await query('SELECT word, pinyin, def FROM bookmarks ORDER BY created_at DESC')
  // One-time move of bookmarks saved by the localStorage version of the app.
  const legacy = legacySaved()
  if (!rows.length && legacy.length) {
    const now = Date.now()
    for (let i = 0; i < legacy.length; i++) {
      const w = legacy[i]
      await run('INSERT OR IGNORE INTO bookmarks (word, pinyin, def, created_at) VALUES (?, ?, ?, ?)', [w.s, w.py || '', w.def || '', now - i])
    }
    rows = await query('SELECT word, pinyin, def FROM bookmarks ORDER BY created_at DESC')
  }
  if (legacy.length) localStorage.removeItem('cvdict.saved')
  saved.value = rows.map((r) => ({ s: r.word, py: r.pinyin, def: r.def }))
}

export const savedReady = dbReady.then(loadSaved).catch((e) => {
  console.warn('SQLite unavailable, bookmarks fall back to localStorage', e)
  useDb = false
  saved.value = legacySaved()
  watch(saved, (v) => {
    try { localStorage.setItem('cvdict.saved', JSON.stringify(v)) } catch {}
  }, { deep: true })
})

export const isSaved = (s) => saved.value.some((w) => w.s === s)

export function toggleSaved(item) {
  const removing = isSaved(item.s)
  saved.value = removing ? saved.value.filter((w) => w.s !== item.s) : [item, ...saved.value]
  if (!useDb) return
  const write = removing
    ? run('DELETE FROM bookmarks WHERE word = ?', [item.s])
    : run('INSERT OR REPLACE INTO bookmarks (word, pinyin, def, created_at) VALUES (?, ?, ?, ?)', [item.s, item.py || '', item.def || '', Date.now()])
  write.catch((e) => console.warn('Bookmark write failed', e))
}
