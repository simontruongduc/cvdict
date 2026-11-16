// Gemini API call that returns extra study info for a dictionary word as structured JSON.
import { Capacitor, CapacitorHttp } from '@capacitor/core'

export const GEMINI_MODEL = 'gemini-3.5-flash-lite'
const TIMEOUT_MS = 20000

const ITEM = {
  type: 'OBJECT',
  properties: { zh: { type: 'STRING' }, py: { type: 'STRING' }, vi: { type: 'STRING' } },
  required: ['zh', 'py', 'vi'],
}
const SCHEMA = {
  type: 'OBJECT',
  properties: {
    usage: { type: 'STRING' },
    examples: { type: 'ARRAY', items: ITEM },
    synonyms: { type: 'ARRAY', items: ITEM },
    antonyms: { type: 'ARRAY', items: ITEM },
  },
  required: ['usage', 'examples', 'synonyms', 'antonyms'],
}

function prompt({ word, pinyin, meanings }) {
  return [
    'Bạn là trợ lý từ điển Trung–Việt cho người Việt học tiếng Trung.',
    `Từ: ${word} (${pinyin}). Nghĩa theo từ điển: ${meanings.join('; ')}.`,
    'Trả về JSON gồm:',
    '- usage: giải thích ngắn gọn bằng tiếng Việt (2–4 câu) về cách dùng, sắc thái nghĩa, ngữ cảnh thường gặp.',
    '- examples: 3–5 câu ví dụ tự nhiên, mỗi câu có zh (chữ Hán giản thể), py (pinyin có dấu thanh), vi (dịch tiếng Việt).',
    '- synonyms: tối đa 5 từ đồng nghĩa hoặc gần nghĩa (zh, py, vi). Không có thì để mảng rỗng.',
    '- antonyms: tối đa 5 từ trái nghĩa (zh, py, vi). Không có thì để mảng rỗng.',
  ].join('\n')
}

const isItem = (x) => x && typeof x.zh === 'string' && typeof x.py === 'string' && typeof x.vi === 'string' && x.zh.trim()

// Errors carry a short Vietnamese `reason` the refresh button can show.
const fail = (reason, cause) => Object.assign(new Error(`Gemini: ${reason}`, { cause }), { reason })

// In the native apps the request goes through the native HTTP stack: WKWebView on iOS
// enforces CORS for its capacitor:// origin, the native client does not.
async function post(url, headers, body) {
  if (Capacitor.isNativePlatform()) {
    let res
    try {
      res = await CapacitorHttp.post({ url, headers, data: body, connectTimeout: TIMEOUT_MS, readTimeout: TIMEOUT_MS, responseType: 'json' })
    } catch (e) {
      throw fail(/timed? ?out/i.test(String(e?.message)) ? 'quá thời gian' : 'lỗi mạng', e)
    }
    if (res.status < 200 || res.status >= 300) throw fail(`HTTP ${res.status}`)
    return typeof res.data === 'string' ? JSON.parse(res.data) : res.data
  }
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  let res
  try {
    res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body), signal: ctrl.signal })
  } catch (e) {
    throw fail(ctrl.signal.aborted ? 'quá thời gian' : 'lỗi mạng', e)
  } finally {
    clearTimeout(timer)
  }
  if (!res.ok) throw fail(`HTTP ${res.status}`)
  return res.json()
}

/** Throws on any failure (network, HTTP, timeout, malformed output). */
export async function fetchWordInfo(ctx, key) {
  const body = await post(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    {
      contents: [{ role: 'user', parts: [{ text: prompt(ctx) }] }],
      generationConfig: { responseMimeType: 'application/json', responseSchema: SCHEMA, temperature: 0.4 },
    },
  )
  let data
  try {
    data = JSON.parse(body?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join(''))
  } catch (e) {
    throw fail('phản hồi không hợp lệ', e)
  }
  const info = {
    usage: typeof data?.usage === 'string' ? data.usage.trim() : '',
    examples: (Array.isArray(data?.examples) ? data.examples : []).filter(isItem),
    synonyms: (Array.isArray(data?.synonyms) ? data.synonyms : []).filter(isItem),
    antonyms: (Array.isArray(data?.antonyms) ? data.antonyms : []).filter(isItem),
  }
  if (!info.usage && !info.examples.length) throw fail('phản hồi không hợp lệ')
  return info
}
