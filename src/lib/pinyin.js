// Pinyin helpers. CVDICT stores pinyin as numbered syllables ("xue2 xi2", "nu:3").

const MARKS = {
  a: 'āáǎà', e: 'ēéěè', i: 'īíǐì', o: 'ōóǒò', u: 'ūúǔù', ü: 'ǖǘǚǜ',
  A: 'ĀÁǍÀ', E: 'ĒÉĚÈ', I: 'ĪÍǏÌ', O: 'ŌÓǑÒ', U: 'ŪÚǓÙ', Ü: 'ǕǗǙǛ',
}

function markSyllable(syl) {
  const m = /^([a-zü:]+)([1-5])$/i.exec(syl)
  if (!m) return syl.replace(/u:/g, 'ü').replace(/U:/g, 'Ü')
  const body = m[1].replace(/u:/g, 'ü').replace(/U:/g, 'Ü')
  const tone = Number(m[2])
  if (tone === 5) return body

  // Standard placement: a/e take the mark, "ou" marks the o, otherwise the last vowel.
  let idx = body.search(/[ae]/i)
  if (idx < 0) idx = body.search(/ou/i)
  if (idx < 0) {
    for (let i = body.length - 1; i >= 0; i--) {
      if ('aeiouüAEIOUÜ'.includes(body[i])) { idx = i; break }
    }
  }
  if (idx < 0) return body
  const v = body[idx]
  return body.slice(0, idx) + MARKS[v][tone - 1] + body.slice(idx + 1)
}

/** "xue2 xi2" -> "xué xí" */
export function toMarks(numbered) {
  return numbered.split(' ').map(markSyllable).join(' ').replace(/\s+([,，。·!?])/g, '$1')
}

/** Lowercase, tone-less, space-less key used for pinyin lookup: "Xue2 xi2" -> "xuexi". */
export function pinyinKey(s) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/u:|ü|u\u0308/g, 'v')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z]/g, '')
}

/** Same as pinyinKey but keeps tone numbers: "xue2 xi2" -> "xue2xi2". */
export function pinyinToneKey(s) {
  return s.toLowerCase().replace(/u:|ü/g, 'v').replace(/[^a-z1-5]/g, '')
}
