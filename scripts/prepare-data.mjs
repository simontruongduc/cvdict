// Copies the dictionary and stroke-order data into public/ so the app works offline
// (web + Capacitor Android). Re-run whenever plan/CVDICT.u8 changes.
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = join(root, 'plan', 'CVDICT.u8')
const outDir = join(root, 'public', 'data')
const out = join(outDir, 'cvdict.u8')

mkdirSync(outDir, { recursive: true })
if (!existsSync(out) || statSync(out).mtimeMs < statSync(src).mtimeMs) {
  const body = readFileSync(src, 'utf8')
    .split('\n')
    .filter((line) => line && !line.startsWith('#'))
    .join('\n')
  writeFileSync(out, body)
  console.log(`dictionary -> ${out}`)
}

const hanziSrc = join(root, 'node_modules', 'hanzi-writer-data')
const hanziOut = join(root, 'public', 'hanzi')
if (!existsSync(hanziOut)) {
  mkdirSync(hanziOut, { recursive: true })
  for (const f of readdirSync(hanziSrc)) {
    if (f.endsWith('.json') && f !== 'package.json') cpSync(join(hanziSrc, f), join(hanziOut, f))
  }
  console.log(`stroke data -> ${hanziOut}`)
}

// sql.js engine used by jeep-sqlite for the web build of @capacitor-community/sqlite. jeep-sqlite bundles the
// sql.js 1.12 JS glue, so the wasm must come from that exact version (pinned in package.json).
const sqlWasm = join(root, 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm')
const sqlWasmOut = join(root, 'public', 'assets', 'sql-wasm.wasm')
if (!existsSync(sqlWasmOut) || statSync(sqlWasmOut).mtimeMs < statSync(sqlWasm).mtimeMs) {
  mkdirSync(dirname(sqlWasmOut), { recursive: true })
  cpSync(sqlWasm, sqlWasmOut)
  console.log(`sql.js wasm -> ${sqlWasmOut}`)
}
