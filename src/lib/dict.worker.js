// Loads CVDICT into memory and answers search / lookup requests off the main thread.
import { pinyinKey, pinyinToneKey, toMarks } from './pinyin.js'

const HAN = /\p{Script=Han}/u
const LETTER = /\p{L}/u
const REF = /([\p{Script=Han}〇○]+)(?:\|([\p{Script=Han}〇○]+))?\[([^\]]+)\]/gu
const VI_MARKS = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i

const SUGGEST_LIMIT = 30
const RESULT_LIMIT = 300

// Entry columns (parallel arrays keep memory low for ~122k entries).
let trad, simp, py, defs, senses, pyKey, pyToneKey, defLower, defFold, score
let byPinyin, bySimp, byTrad
let syllables, syllablePrefixes
let ready

const fold = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D')

async function load(url) {
  const text = await (await fetch(url)).text()
  const lines = text.split('\n')
  trad = []; simp = []; py = []; defs = []; senses = []
  const line = /^(\S+) (\S+) \[([^\]]*)\] \/(.*)\/\s*$/
  for (const l of lines) {
    const m = line.exec(l)
    if (!m) continue
    trad.push(m[1]); simp.push(m[2]); py.push(m[3]); defs.push(m[4])
  }
  const n = simp.length

  pyKey = new Array(n); pyToneKey = new Array(n); defLower = new Array(n); defFold = new Array(n)
  syllables = new Set()
  const charFreq = new Map()
  for (let i = 0; i < n; i++) {
    pyKey[i] = pinyinKey(py[i])
    pyToneKey[i] = pinyinToneKey(py[i])
    defLower[i] = defs[i].toLowerCase()
    defFold[i] = fold(defLower[i])
    for (const s of py[i].split(' ')) {
      const k = pinyinKey(s)
      if (k) syllables.add(k)
    }
    for (const c of simp[i]) charFreq.set(c, (charFreq.get(c) || 0) + 1)
  }
  syllablePrefixes = new Set()
  for (const s of syllables) for (let j = 1; j <= s.length; j++) syllablePrefixes.add(s.slice(0, j))

  // No frequency list ships with CVDICT, so approximate "commonness": characters that
  // appear in many headwords are common; proper nouns and variant entries rank lower.
  score = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    let sum = 0, len = 0
    for (const c of simp[i]) { sum += Math.log((charFreq.get(c) || 0) + 1); len++ }
    let s = len ? sum / len : 0
    if (/^[A-Z]/.test(py[i])) s -= 2.5
    if (/^(biến thể|cách viết|dạng cổ|cách viết cổ)/.test(defLower[i])) s -= 4
    if (!HAN.test(simp[i])) s -= 3
    score[i] = s
  }

  const ids = Array.from({ length: n }, (_, i) => i)
  byPinyin = ids.slice().sort((a, b) => cmp(pyKey[a], pyKey[b]))
  bySimp = ids.slice().sort((a, b) => cmp(simp[a], simp[b]))
  byTrad = ids.slice().sort((a, b) => cmp(trad[a], trad[b]))
  return { entries: n }
}

const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0)

function lowerBound(sorted, keyOf, q) {
  let lo = 0, hi = sorted.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (keyOf(sorted[mid]) < q) lo = mid + 1
    else hi = mid
  }
  return lo
}

function prefixScan(sorted, keyOf, q, max = 5000) {
  const out = []
  for (let i = lowerBound(sorted, keyOf, q); i < sorted.length && out.length < max; i++) {
    if (!keyOf(sorted[i]).startsWith(q)) break
    out.push(sorted[i])
  }
  return out
}

/** Can the latin string be split into pinyin syllables (the last one may be half-typed)? */
function isPinyin(q) {
  const ok = new Array(q.length + 1).fill(false)
  ok[0] = true
  for (let i = 0; i < q.length; i++) {
    if (!ok[i]) continue
    for (let j = i + 1; j <= Math.min(q.length, i + 6); j++) {
      const part = q.slice(i, j)
      if (syllables.has(part) || (j === q.length && syllablePrefixes.has(part))) ok[j] = true
    }
  }
  return ok[q.length]
}

export function detectKind(raw) {
  const q = raw.trim()
  if (!q) return 'empty'
  if (HAN.test(q)) return 'hanzi'
  if (VI_MARKS.test(q)) return 'vi'
  if (/^[a-zA-Z\s'ü:]+[1-5]?(\s*[a-zA-Z'ü:]+[1-5]?)*$/.test(q) && isPinyin(pinyinKey(q))) return 'pinyin'
  return 'vi'
}

const byRank = (a, b) => score[b] - score[a] || simp[a].length - simp[b].length || a - b

function dedupe(ids) {
  const seen = new Set()
  return ids.filter((i) => (seen.has(i) ? false : (seen.add(i), true)))
}

function searchHanzi(q) {
  const keySimp = (i) => simp[i], keyTrad = (i) => trad[i]
  const prefix = dedupe([...prefixScan(bySimp, keySimp, q), ...prefixScan(byTrad, keyTrad, q)])
  const exact = prefix.filter((i) => simp[i] === q || trad[i] === q).sort(byRank)
  const starts = prefix
    .filter((i) => simp[i] !== q && trad[i] !== q)
    .sort((a, b) => simp[a].length - simp[b].length || byRank(a, b))
  const startSet = new Set(prefix)
  const contains = []
  for (let i = 0; i < simp.length; i++) {
    if (!startSet.has(i) && (simp[i].includes(q) || trad[i].includes(q))) contains.push(i)
  }
  contains.sort((a, b) => simp[a].length - simp[b].length || byRank(a, b))
  return { match: [...exact, ...starts], contains }
}

function searchPinyin(raw) {
  const hasTone = /[1-5]/.test(raw)
  const q = hasTone ? pinyinToneKey(raw) : pinyinKey(raw)
  const keyOf = hasTone ? (i) => pyToneKey[i] : (i) => pyKey[i]
  let ids = prefixScan(byPinyin, (i) => pyKey[i], pinyinKey(raw), 20000)
  if (hasTone) ids = ids.filter((i) => keyOf(i).startsWith(q))
  const exact = ids.filter((i) => keyOf(i) === q).sort(byRank)
  const starts = ids
    .filter((i) => keyOf(i) !== q)
    .sort((a, b) => simp[a].length - simp[b].length || byRank(a, b))
  return { match: [...exact, ...starts], contains: [] }
}

function isWordAt(text, at, len) {
  const before = at > 0 ? text[at - 1] : ' '
  const after = at + len < text.length ? text[at + len] : ' '
  return !LETTER.test(before) && !LETTER.test(after)
}

/** Index of the first sub-sense (split on / ; ,) equal to q, ignoring "(...)" notes. -1 if none. */
function exactSenseIndex(text, q) {
  const parts = text.split(/[/;,]/)
  for (let k = 0; k < parts.length; k++) {
    if (parts[k].replace(/\([^)]*\)/g, '').trim() === q) return k
  }
  return -1
}

function searchVietnamese(raw) {
  const folded = !VI_MARKS.test(raw)
  const q = folded ? fold(raw.trim().toLowerCase()) : raw.trim().toLowerCase()
  const col = folded ? defFold : defLower
  const exact = [], contains = []
  const rank = new Map()
  for (let i = 0; i < col.length; i++) {
    const text = col[i]
    let at = text.indexOf(q)
    let hit = false
    while (at >= 0) {
      if (isWordAt(text, at, q.length)) { hit = true; break }
      at = text.indexOf(q, at + 1)
    }
    if (!hit) continue
    const k = exactSenseIndex(text, q)
    if (k >= 0) { exact.push(i); rank.set(i, k) } else contains.push(i)
  }
  exact.sort((a, b) => rank.get(a) - rank.get(b) || simp[a].length - simp[b].length || byRank(a, b))
  contains.sort((a, b) => simp[a].length - simp[b].length || byRank(a, b))
  return { match: exact, contains }
}

/** Replaces "學分制|学分制[xue2 fen1 zhi4]" refs with just the simplified form, for list previews. */
const plainRefs = (s) => s.replace(REF, (_, a, b) => b || a)

function brief(i) {
  const parts = defs[i]
    .split('/')
    .filter((p) => !/^(LT|Lượng từ)\s*:/.test(p))
    .map(plainRefs)
  return { id: i, s: simp[i], t: trad[i], py: toMarks(py[i]), def: parts.slice(0, 4).join('; ') }
}

function search(raw, mode) {
  const kind = detectKind(raw)
  if (kind === 'empty') return { kind, match: [], contains: [] }
  let r
  if (kind === 'hanzi') r = searchHanzi(raw.trim().replace(/\s+/g, ''))
  else if (kind === 'pinyin') {
    r = searchPinyin(raw)
    // "an", "ban"... are valid pinyin and Vietnamese. Fall back to meanings if pinyin finds little.
    if (r.match.length < 5) {
      const vi = searchVietnamese(raw)
      r = { match: [...r.match, ...vi.match], contains: vi.contains }
    }
  } else r = searchVietnamese(raw)

  if (mode === 'suggest') {
    const ids = [...r.match, ...r.contains].slice(0, SUGGEST_LIMIT)
    return { kind, match: ids.map(brief), contains: [], total: r.match.length + r.contains.length }
  }
  return {
    kind,
    match: r.match.slice(0, RESULT_LIMIT).map(brief),
    contains: r.contains.slice(0, RESULT_LIMIT).map(brief),
    matchTotal: r.match.length,
    containsTotal: r.contains.length,
  }
}

function lookupWord(w) {
  const keySimp = (i) => simp[i], keyTrad = (i) => trad[i]
  const ids = dedupe([
    ...prefixScan(bySimp, keySimp, w).filter((i) => simp[i] === w),
    ...prefixScan(byTrad, keyTrad, w).filter((i) => trad[i] === w),
  ]).sort(byRank)
  return ids
}

function entryDetail(i) {
  const all = defs[i].split('/')
  const measure = all.filter((p) => /^(LT|Lượng từ)\s*:/.test(p)).map((p) => p.replace(/^(LT|Lượng từ)\s*:\s*/, ''))
  const meanings = all.filter((p) => !/^(LT|Lượng từ)\s*:/.test(p))
  return { id: i, s: simp[i], t: trad[i], py: toMarks(py[i]), meanings, measure }
}

function word(w) {
  const ids = lookupWord(w)
  if (!ids.length) return null
  const s = simp[ids[0]]

  const chars = []
  const hz = [...s].filter((c) => HAN.test(c))
  if (hz.length > 1) {
    for (const c of hz) {
      const cid = lookupWord(c)[0]
      if (cid !== undefined) chars.push(brief(cid))
    }
  }

  // CVDICT has no example sentences; idioms/sayings that contain the word stand in for them.
  const phrases = [], compounds = []
  for (let i = 0; i < simp.length; i++) {
    if (simp[i] === s || !simp[i].includes(s)) continue
    if (/[，,。]/.test(simp[i]) || /thành ngữ|tục ngữ|câu nói|khẩu hiệu/.test(defLower[i])) phrases.push(i)
    else compounds.push(i)
  }
  phrases.sort((a, b) => simp[a].length - simp[b].length || byRank(a, b))
  compounds.sort((a, b) => simp[a].length - simp[b].length || byRank(a, b))

  return {
    s,
    t: trad[ids[0]],
    entries: ids.map(entryDetail),
    chars,
    phrases: phrases.slice(0, 8).map(brief),
    compounds: compounds.slice(0, 40).map(brief),
    compoundsTotal: compounds.length,
  }
}

self.onmessage = async (e) => {
  const { id, type, payload } = e.data
  try {
    let result
    if (type === 'init') result = await (ready ||= load(payload.url))
    else {
      await ready
      if (type === 'search') result = search(payload.q, payload.mode)
      else if (type === 'word') result = word(payload.w)
    }
    self.postMessage({ id, result })
  } catch (err) {
    self.postMessage({ id, error: String(err?.message || err) })
  }
}
