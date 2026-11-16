// Per-device history and bookmarks (localStorage; swap for Capacitor Preferences later if needed).
import { ref, watch } from 'vue'

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
export const saved = persisted('cvdict.saved', [])

const sameItem = (a, b) => a.type === b.type && (a.type === 'word' ? a.s === b.s : a.q === b.q)

export function pushHistory(item) {
  history.value = [item, ...history.value.filter((h) => !sameItem(h, item))].slice(0, 50)
}

export const clearHistory = () => { history.value = [] }

export const isSaved = (s) => saved.value.some((w) => w.s === s)

export function toggleSaved(item) {
  saved.value = isSaved(item.s) ? saved.value.filter((w) => w.s !== item.s) : [item, ...saved.value]
}
