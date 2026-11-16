// Promise wrapper around the dictionary worker.
import DictWorker from './dict.worker.js?worker'

const worker = new DictWorker()
const pending = new Map()
let seq = 0

worker.onmessage = (e) => {
  const { id, result, error } = e.data
  const p = pending.get(id)
  if (!p) return
  pending.delete(id)
  error ? p.reject(new Error(error)) : p.resolve(result)
}

function call(type, payload) {
  const id = ++seq
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject })
    worker.postMessage({ id, type, payload })
  })
}

export const dictReady = call('init', { url: new URL(`${import.meta.env.BASE_URL}data/cvdict.u8`, location.href).href })

/** mode: 'suggest' (top hits, one list) or 'full' (match + contains lists). */
export const search = (q, mode = 'suggest') => call('search', { q, mode })
export const getWord = (w) => call('word', { w })
