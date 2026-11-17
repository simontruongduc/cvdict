import { toMarks } from './pinyin.js'

const REF = /([\p{Script=Han}〇○]+)(?:\|([\p{Script=Han}〇○]+))?\[([^\]]+)\]/gu

/** Splits a CVDICT sense into text and cross-reference segments ("學分制|学分制[xue2 fen1 zhi4]"),
 * showing references in the given script. */
export function segments(text, script = 'simp') {
  const out = []
  let last = 0
  for (const m of text.matchAll(REF)) {
    if (m.index > last) out.push({ text: text.slice(last, m.index) })
    out.push({ hz: script === 'trad' ? m[1] : m[2] || m[1], py: toMarks(m[3]) })
    last = m.index + m[0].length
  }
  if (last < text.length) out.push({ text: text.slice(last) })
  return out
}
