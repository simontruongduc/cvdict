const fold = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D')

/**
 * Splits text into [{ text, hit }] around whole-word occurrences of q.
 * Matching is accent-insensitive when q has no Vietnamese accents (folding keeps NFC lengths).
 */
export function highlight(text, q) {
  const needle = q.trim().toLowerCase()
  if (!needle) return [{ text, hit: false }]
  const accentless = fold(needle) === needle
  const hay = (accentless ? fold(text.normalize('NFC')) : text.normalize('NFC')).toLowerCase()
  const src = text.normalize('NFC')
  const out = []
  let last = 0
  let at = hay.indexOf(needle)
  while (at >= 0) {
    const before = hay[at - 1], after = hay[at + needle.length]
    const isWord = !(before && /\p{L}/u.test(before)) && !(after && /\p{L}/u.test(after))
    if (isWord) {
      if (at > last) out.push({ text: src.slice(last, at), hit: false })
      out.push({ text: src.slice(at, at + needle.length), hit: true })
      last = at + needle.length
    }
    at = hay.indexOf(needle, at + needle.length)
  }
  if (last < src.length) out.push({ text: src.slice(last), hit: false })
  return out
}
