// Gemini API calls that return structured JSON: extra study info for a dictionary word,
// a translation + breakdown for a free-text sentence, and quick Vietnamese ⇄ Chinese translation.
import { Capacitor, CapacitorHttp } from '@capacitor/core'

export const GEMINI_MODEL = 'gemini-3.5-flash-lite'
const TIMEOUT_MS = 20000

const ITEM = {
  type: 'OBJECT',
  properties: { zh: { type: 'STRING' }, py: { type: 'STRING' }, vi: { type: 'STRING' } },
  required: ['zh', 'py', 'vi'],
}
const WORD_SCHEMA = {
  type: 'OBJECT',
  properties: {
    usage: { type: 'STRING' },
    examples: { type: 'ARRAY', items: ITEM },
    synonyms: { type: 'ARRAY', items: ITEM },
    antonyms: { type: 'ARRAY', items: ITEM },
  },
  required: ['usage', 'examples', 'synonyms', 'antonyms'],
}

// script: 'trad' | 'simp' — every Chinese character in the answer follows the script of the word being viewed.
function wordPrompt({ word, pinyin, meanings, script }) {
  const hz = script === 'trad' ? 'chữ Hán phồn thể' : 'chữ Hán giản thể'
  return [
    'Bạn là trợ lý từ điển Trung–Việt cho người Việt học tiếng Trung.',
    `Từ: ${word} (${pinyin}). Nghĩa theo từ điển: ${meanings.join('; ')}.`,
    `Mọi chữ Hán trong kết quả (trường zh, và khi nhắc tới từ trong usage) phải viết bằng ${hz}.`,
    'Trả về JSON gồm:',
    '- usage: giải thích ngắn gọn bằng tiếng Việt (2–4 câu) về cách dùng, sắc thái nghĩa, ngữ cảnh thường gặp.',
    `- examples: 3–5 câu ví dụ tự nhiên, mỗi câu có zh (${hz}), py (pinyin có dấu thanh), vi (dịch tiếng Việt).`,
    '- synonyms: tối đa 5 từ đồng nghĩa hoặc gần nghĩa (zh, py, vi). Không có thì để mảng rỗng.',
    '- antonyms: tối đa 5 từ trái nghĩa (zh, py, vi). Không có thì để mảng rỗng.',
  ].join('\n')
}

const SENTENCE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    chinese: { type: 'STRING' },
    pinyin: { type: 'STRING' },
    vietnamese: { type: 'STRING' },
    words: { type: 'ARRAY', items: ITEM },
    grammar: {
      type: 'ARRAY',
      items: { type: 'OBJECT', properties: { title: { type: 'STRING' }, explain: { type: 'STRING' } }, required: ['title', 'explain'] },
    },
  },
  required: ['chinese', 'pinyin', 'vietnamese', 'words', 'grammar'],
}

function sentencePrompt(text) {
  return [
    'Bạn là trợ lý dịch và phân tích câu Trung–Việt cho người Việt học tiếng Trung.',
    `Câu người dùng nhập (có thể là tiếng Trung, tiếng Việt hoặc pinyin): ${text}`,
    'Trả về JSON gồm:',
    '- chinese: câu tiếng Trung. Nếu câu nhập là tiếng Trung thì giữ nguyên, kể cả dạng chữ (giản thể hay phồn thể); nếu là ngôn ngữ khác thì dịch sang tiếng Trung giản thể tự nhiên.',
    '- pinyin: pinyin có dấu thanh của câu chinese.',
    '- vietnamese: bản dịch tiếng Việt tự nhiên của câu chinese.',
    '- words: tách câu chinese thành từng từ theo đúng thứ tự (bỏ dấu câu), mỗi từ có zh (cùng dạng chữ với câu chinese), py (pinyin có dấu thanh), vi (nghĩa tiếng Việt trong ngữ cảnh câu).',
    '- grammar: 0–4 điểm ngữ pháp hoặc cấu trúc đáng chú ý trong câu, mỗi điểm có title (cấu trúc, ví dụ "把 + tân ngữ + động từ") và explain (giải thích ngắn gọn bằng tiếng Việt). Câu quá đơn giản thì để mảng rỗng.',
  ].join('\n')
}

const TRANSLATE_SCHEMA = {
  type: 'OBJECT',
  properties: { source: { type: 'STRING', enum: ['zh', 'vi'] }, translation: { type: 'STRING' }, pinyin: { type: 'STRING' } },
  required: ['source', 'translation', 'pinyin'],
}

function translatePrompt(text, { traditional }) {
  return [
    'Tự nhận diện ngôn ngữ của đoạn văn dưới đây rồi dịch:',
    '- Nếu là tiếng Trung (giản thể hoặc phồn thể): dịch sang tiếng Việt.',
    `- Nếu là tiếng Việt hoặc ngôn ngữ khác: dịch sang tiếng Trung ${traditional ? 'phồn thể (chữ Hán phồn thể)' : 'giản thể'}.`,
    'Bản dịch tự nhiên, giữ nguyên ý và giọng văn.',
    'Trả về JSON gồm:',
    '- source: "zh" nếu đoạn văn là tiếng Trung, ngược lại "vi".',
    '- translation: chỉ bản dịch, không giải thích, giữ nguyên xuống dòng.',
    '- pinyin: pinyin có dấu thanh của phần tiếng Trung (đoạn gốc nếu source là "zh", bản dịch nếu không).',
    'Đoạn văn:',
    text,
  ].join('\n')
}

const isItem = (x) => x && typeof x.zh === 'string' && typeof x.py === 'string' && typeof x.vi === 'string' && x.zh.trim()

// Errors carry a short Vietnamese `reason` and, for HTTP errors, the response body as `detail`.
const fail = (reason, cause, detail) => Object.assign(new Error(`Gemini: ${reason}`, { cause }), { reason, detail })
const bodyText = (v) => (typeof v === 'string' ? v : JSON.stringify(v, null, 2) || '').slice(0, 2000)

// In the native apps the request goes through the native HTTP stack: WKWebView on iOS
// enforces CORS for its capacitor:// origin, the native client does not.
async function postOnce(url, headers, body) {
  if (Capacitor.isNativePlatform()) {
    let res
    try {
      res = await CapacitorHttp.post({ url, headers, data: body, connectTimeout: TIMEOUT_MS, readTimeout: TIMEOUT_MS, responseType: 'json' })
    } catch (e) {
      throw fail(/timed? ?out/i.test(String(e?.message)) ? 'quá thời gian' : 'lỗi mạng', e)
    }
    if (res.status < 200 || res.status >= 300) throw fail(`HTTP ${res.status}`, undefined, bodyText(res.data))
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
  if (!res.ok) throw fail(`HTTP ${res.status}`, undefined, bodyText(await res.text().catch(() => '')))
  return res.json()
}

// Gemini often answers 503 ("high demand") for a moment: retry once after a short pause.
async function post(url, headers, body) {
  try {
    return await postOnce(url, headers, body)
  } catch (e) {
    if (e.reason !== 'HTTP 503') throw e
    await new Promise((r) => setTimeout(r, 1000))
    return postOnce(url, headers, body)
  }
}

// Sends one prompt and returns the parsed JSON answer.
async function generate(text, schema, key) {
  const body = await post(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    {
      contents: [{ role: 'user', parts: [{ text }] }],
      generationConfig: { responseMimeType: 'application/json', responseSchema: schema, temperature: 0.4 },
    },
  )
  try {
    return JSON.parse(body?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join(''))
  } catch (e) {
    throw fail('phản hồi không hợp lệ', e, bodyText(body))
  }
}

const str = (v) => (typeof v === 'string' ? v.trim() : '')
const items = (v) => (Array.isArray(v) ? v : []).filter(isItem)

/** Throws on any failure (network, HTTP, timeout, malformed output). */
export async function fetchWordInfo(ctx, key) {
  const data = await generate(wordPrompt(ctx), WORD_SCHEMA, key)
  const info = { usage: str(data?.usage), examples: items(data?.examples), synonyms: items(data?.synonyms), antonyms: items(data?.antonyms) }
  if (!info.usage && !info.examples.length) throw fail('phản hồi không hợp lệ')
  return info
}

/** Translation and word-by-word breakdown of a free-text sentence. Throws on any failure. */
export async function fetchSentenceInfo(text, key) {
  const data = await generate(sentencePrompt(text), SENTENCE_SCHEMA, key)
  const info = {
    chinese: str(data?.chinese),
    pinyin: str(data?.pinyin),
    vietnamese: str(data?.vietnamese),
    words: items(data?.words),
    grammar: (Array.isArray(data?.grammar) ? data.grammar : []).filter((g) => str(g?.title) && str(g?.explain)),
  }
  if (!info.chinese || !info.vietnamese) throw fail('phản hồi không hợp lệ')
  return info
}

/** Quick translation; Gemini detects the language. opts: { traditional } (for output in Chinese). → { source, text, pinyin } */
export async function translateText(text, opts, key) {
  const data = await generate(translatePrompt(text, opts), TRANSLATE_SCHEMA, key)
  const out = { source: data?.source === 'zh' ? 'zh' : 'vi', text: str(data?.translation), pinyin: str(data?.pinyin) }
  if (!out.text) throw fail('phản hồi không hợp lệ', undefined, JSON.stringify(data))
  return out
}
