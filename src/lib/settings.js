// Key/value settings stored in the SQLite `settings` table.
import { ref } from 'vue'
import { dbReady, query, run } from './db.js'

export async function getSetting(key) {
  const rows = await query('SELECT value FROM settings WHERE key = ?', [key])
  return rows[0]?.value ?? null
}

export function setSetting(key, value) {
  return value == null || value === ''
    ? run('DELETE FROM settings WHERE key = ?', [key])
    : run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, String(value)])
}

export const geminiKey = ref('')
dbReady.then(() => getSetting('gemini_key')).then((v) => { geminiKey.value = v || '' }).catch(() => {})

export async function saveGeminiKey(value) {
  const v = value.trim()
  await setSetting('gemini_key', v)
  geminiKey.value = v
}
