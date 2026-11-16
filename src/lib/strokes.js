// Stroke-order data (Make Me a Hanzi via hanzi-writer-data), bundled under public/hanzi/.
const cache = new Map()

export function loadStrokes(char) {
  if (!cache.has(char)) {
    const url = `${import.meta.env.BASE_URL}hanzi/${encodeURIComponent(char)}.json`
    const p = fetch(url).then((r) => {
      if (!r.ok) throw new Error(`Không có dữ liệu nét cho ${char}`)
      return r.json()
    })
    p.catch(() => cache.delete(char))
    cache.set(char, p)
  }
  return cache.get(char)
}

/** Median polyline as an SVG path plus its length (for the stroke-drawing animation). */
export function medianPath(points) {
  let len = 0
  for (let i = 1; i < points.length; i++) {
    len += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1])
  }
  return { d: 'M ' + points.map((p) => p.join(' ')).join(' L '), len: Math.ceil(len) }
}
