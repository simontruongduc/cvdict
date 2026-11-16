// Gemini API call that returns extra study info for a dictionary word as structured JSON.
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

/** Throws on any failure (network, HTTP, timeout, malformed output). */
export async function fetchWordInfo(ctx, key) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt(ctx) }] }],
        generationConfig: { responseMimeType: 'application/json', responseSchema: SCHEMA, temperature: 0.4 },
      }),
      signal: ctrl.signal,
    })
    if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`)
    const body = await res.json()
    const text = body?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('')
    const data = JSON.parse(text)
    const info = {
      usage: typeof data.usage === 'string' ? data.usage.trim() : '',
      examples: (Array.isArray(data.examples) ? data.examples : []).filter(isItem),
      synonyms: (Array.isArray(data.synonyms) ? data.synonyms : []).filter(isItem),
      antonyms: (Array.isArray(data.antonyms) ? data.antonyms : []).filter(isItem),
    }
    if (!info.usage && !info.examples.length) throw new Error('Gemini returned no usable content')
    return info
  } finally {
    clearTimeout(timer)
  }
}
