<script setup>
// Handwriting input sheet. Strokes of the character being written are recognized after each
// pause; the best match is written into the search text live (v-model) and the other
// candidates can replace it. Tapping a candidate keeps it and clears the pad for the next character.
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import AppIcon from './AppIcon.vue'
import { recognize } from '../lib/handwriting.js'

const props = defineProps({ modelValue: { type: String, default: '' } })
const emit = defineEmits(['update:modelValue', 'close'])

const PAUSE_MS = 500
const pad = ref(null)
const strokes = ref([]) // finished strokes of the current character: [[[x, y], ...], ...]
const cur = ref(null) // stroke being drawn
const cands = ref([])
const sel = ref(0)
let prefix = '' // search text before the character being written
let latest = props.modelValue // value last emitted or received (props lag one render behind emits)
let timer, seq = 0

watch(() => props.modelValue, (v) => { latest = v })
function setValue(v) {
  latest = v
  emit('update:modelValue', v)
}

const toD = (pts) => (pts.length === 1 ? [pts[0], [pts[0][0] + 0.5, pts[0][1] + 0.5]] : pts)
  .map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ')

function point(e) {
  const r = pad.value.getBoundingClientRect()
  return [e.clientX - r.left, e.clientY - r.top]
}

function down(e) {
  clearTimeout(timer)
  if (!strokes.value.length) prefix = latest
  pad.value.setPointerCapture?.(e.pointerId)
  cur.value = [point(e)]
}

function move(e) {
  if (cur.value) cur.value.push(point(e))
}

function up() {
  if (!cur.value) return
  strokes.value.push(cur.value)
  cur.value = null
  timer = setTimeout(lookup, PAUSE_MS)
}

async function lookup() {
  const mine = ++seq
  // hanzi_lookup only handles coordinates within 0–255: scale the pad down, keeping its aspect ratio.
  const r = pad.value.getBoundingClientRect()
  const k = 255 / Math.max(r.width, r.height, 1)
  const input = strokes.value.map((s) => s.map((p) => [Math.round(p[0] * k), Math.round(p[1] * k)]))
  if (!input.length) return
  try {
    const res = await recognize(input)
    if (mine !== seq) return
    cands.value = res.map((m) => m.hanzi)
    sel.value = 0
    setValue(prefix + (cands.value[0] || ''))
  } catch (e) {
    console.warn('Handwriting recognition failed', e)
  }
}

function resetChar() {
  seq++
  clearTimeout(timer)
  strokes.value = []
  cur.value = null
  cands.value = []
  sel.value = 0
}

function pick(i) {
  setValue(prefix + cands.value[i])
  resetChar()
}

function undo() {
  if (!strokes.value.length) return
  strokes.value.pop()
  if (strokes.value.length) { clearTimeout(timer); lookup() } else { setValue(prefix); resetChar() }
}

function clear() {
  if (strokes.value.length) setValue(prefix)
  resetChar()
}

function done() {
  resetChar()
  emit('close')
}

function onBack(e) {
  e.preventDefault()
  done()
}
const onKey = (e) => { if (e.key === 'Escape') done() }

onMounted(() => {
  window.addEventListener('app-back', onBack)
  document.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  clearTimeout(timer)
  window.removeEventListener('app-back', onBack)
  document.removeEventListener('keydown', onKey)
})
</script>

<template>
  <section class="sheet" aria-label="Khung viết tay">
    <div class="grip" aria-hidden="true" />
    <div class="head">
      <h2>Viết tay</h2>
      <button class="icon-btn" aria-label="Xóa nét cuối" :disabled="!strokes.length" @click="undo"><AppIcon name="undo" :size="20" :stroke-width="2" /></button>
      <button class="text-btn" @click="clear">Xóa</button>
      <button class="text-btn strong" @click="done">Xong</button>
    </div>

    <div class="cands" aria-live="polite">
      <button
        v-for="(c, i) in cands" :key="c + i" :class="['cand', 'hz', { on: i === sel }]" :aria-label="`Chọn chữ ${c}`"
        @click="pick(i)"
      >{{ c }}</button>
      <span v-if="!cands.length" class="hint">Gợi ý chữ sẽ hiện sau khi bạn ngừng viết</span>
    </div>

    <div class="area">
      <svg
        ref="pad" class="pad" role="img" aria-label="Vùng viết chữ Hán bằng tay"
        @pointerdown.prevent="down" @pointermove="move" @pointerup="up" @pointercancel="up"
      >
        <g class="guides">
          <line x1="50%" y1="0" x2="50%" y2="100%" />
          <line x1="0" y1="50%" x2="100%" y2="50%" />
          <line x1="0" y1="0" x2="100%" y2="100%" />
          <line x1="100%" y1="0" x2="0" y2="100%" />
        </g>
        <g class="ink">
          <path v-for="(s, i) in strokes" :key="i" :d="toD(s)" />
          <path v-if="cur" :d="toD(cur)" />
        </g>
      </svg>
      <span v-if="!strokes.length && !cur" class="placeholder">Viết một chữ Hán vào đây</span>
    </div>
  </section>
</template>

<style scoped>
.sheet {
  position: fixed; left: 50%; bottom: 0; transform: translateX(-50%); z-index: 40; width: 100%; max-width: 520px;
  background: var(--surface); border-radius: 24px 24px 0 0; box-shadow: 0 -8px 30px rgba(0, 0, 0, 0.12);
  padding: 8px 16px calc(var(--sab) + 20px); display: flex; flex-direction: column; gap: 10px;
}
.grip { align-self: center; width: 36px; height: 5px; border-radius: 3px; background: var(--border-2); }
.head { display: flex; align-items: center; gap: 2px; }
.head h2 { flex: 1; margin: 0; font-size: 17px; font-weight: 600; }
.head .icon-btn:disabled { color: var(--chevron); cursor: default; }
.text-btn { height: 44px; border: none; background: none; padding: 0 10px; font-size: 16px; color: var(--accent-text); cursor: pointer; }
.text-btn.strong { font-weight: 600; padding-right: 4px; }
.cands { height: 48px; display: flex; align-items: center; gap: 8px; overflow-x: auto; }
.cand {
  width: 48px; height: 48px; flex-shrink: 0; border: none; border-radius: 12px; background: var(--chip);
  font-size: 24px; font-weight: 500; color: var(--text); cursor: pointer; padding: 0;
}
.cand.on { background: var(--accent); color: #fff; }
.hint { font-size: 14px; color: var(--muted); }
.area { position: relative; height: 260px; border-radius: 18px; background: #FAFAFC; border: 1px solid var(--border); overflow: hidden; }
.pad { display: block; width: 100%; height: 100%; touch-action: none; cursor: crosshair; }
.guides line { stroke: var(--border); stroke-width: 1.2; stroke-dasharray: 6 6; }
.ink path { fill: none; stroke: var(--text); stroke-width: 7; stroke-linecap: round; stroke-linejoin: round; }
.placeholder {
  position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
  font-size: 15px; color: var(--muted); pointer-events: none;
}
</style>
