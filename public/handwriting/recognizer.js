// Classic worker around hanzi_lookup (https://github.com/gugray/hanzi_lookup, LGPL-3.0).
// Message in: { id, strokes: [[[x, y], ...], ...], limit }  →  out: { id, result: [{ hanzi, score }] } | { id, error }
importScripts('hanzi_lookup.js')

// Pass the bytes ourselves: the bundled loader's streaming fallback re-reads a consumed response.
const ready = fetch('hanzi_lookup_bg.wasm')
  .then((r) => r.arrayBuffer())
  .then((bytes) => wasm_bindgen(bytes))

onmessage = async (e) => {
  const { id, strokes, limit } = e.data
  try {
    await ready
    postMessage({ id, result: JSON.parse(wasm_bindgen.lookup(strokes, limit || 8)) })
  } catch (err) {
    postMessage({ id, error: String(err?.message || err) })
  }
}
