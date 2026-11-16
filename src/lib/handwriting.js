// Promise wrapper around the handwriting recognizer worker (public/handwriting/), created on first use.
let worker
const pending = new Map()
let seq = 0

function getWorker() {
  if (!worker) {
    worker = new Worker(new URL(`${import.meta.env.BASE_URL}handwriting/recognizer.js`, location.href))
    worker.onmessage = (e) => {
      const { id, result, error } = e.data
      const p = pending.get(id)
      if (!p) return
      pending.delete(id)
      error ? p.reject(new Error(error)) : p.resolve(result)
    }
  }
  return worker
}

/** strokes: [[[x, y], ...], ...] → [{ hanzi, score }], best match first. */
export function recognize(strokes, limit = 8) {
  const id = ++seq
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject })
    getWorker().postMessage({ id, strokes, limit })
  })
}
