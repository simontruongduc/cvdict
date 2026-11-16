<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import AppIcon from './AppIcon.vue'
import PracticeSheet from './PracticeSheet.vue'
import { loadStrokes, medianPath } from '../lib/strokes.js'

const props = defineProps({
  chars: { type: Array, required: true }, // [{ hz, py }]
})

const DONE = 'var(--text)', TODO = 'var(--stroke-todo)', RAD = 'var(--radical)', CUR = 'var(--accent)'
const uid = `so${Math.random().toString(36).slice(2, 8)}`

const ci = ref(0)
const data = ref(null)
const error = ref('')
const step = ref(0) // index of the stroke being drawn; === n means the character is complete
const animKey = ref(0) // bump to replay the drawing animation of the current stroke
const rad = ref(false)
const practicing = ref(false)
let timer = null

const cur = computed(() => props.chars[ci.value])
const n = computed(() => data.value?.strokes.length || 0)
const radSet = computed(() => new Set(data.value?.radStrokes || []))

watch(
  () => props.chars.map((c) => c.hz).join(),
  () => { ci.value = 0; load() },
  { immediate: true },
)
watch(ci, load)

async function load() {
  stop()
  data.value = null
  error.value = ''
  const hz = cur.value?.hz
  if (!hz) return
  try {
    const d = await loadStrokes(hz)
    if (cur.value?.hz !== hz) return
    data.value = d
    step.value = d.strokes.length
  } catch (e) {
    error.value = e.message
  }
}

function fillFor(i, upto) {
  if (i < upto) return rad.value && radSet.value.has(i) ? RAD : DONE
  return TODO
}

const bigStrokes = computed(() => (data.value ? data.value.strokes.map((d, i) => ({ d, fill: fillFor(i, step.value) })) : []))
const current = computed(() => {
  if (!data.value || step.value >= n.value) return null
  return { stroke: data.value.strokes[step.value], ...medianPath(data.value.medians[step.value]) }
})
const seq = computed(() =>
  data.value
    ? data.value.strokes.map((_, i) => ({
        no: i + 1,
        strokes: data.value.strokes.map((d, j) => ({ d, fill: j === i ? CUR : fillFor(j, i) })),
      }))
    : [],
)
const stepLabel = computed(() => (step.value >= n.value ? `Hoàn chỉnh · ${n.value} nét` : `Nét ${step.value + 1} / ${n.value}`))

function goTo(i) {
  step.value = Math.max(0, Math.min(n.value, i))
  animKey.value++
}

function stop() {
  clearInterval(timer)
  timer = null
}

function prev() { stop(); goTo(Math.min(step.value, n.value) - 1) }
function next() { stop(); goTo(step.value + 1) }
function pick(i) { stop(); goTo(i) }

function play() {
  stop()
  goTo(0)
  timer = setInterval(() => {
    goTo(step.value + 1)
    if (step.value >= n.value) stop()
  }, 750)
}

onBeforeUnmount(stop)
</script>

<template>
  <div class="so">
    <div class="so-head">
      <div v-if="chars.length > 1" class="char-tabs" role="tablist" aria-label="Chọn chữ">
        <button
          v-for="(c, i) in chars" :key="c.hz + i" role="tab" :aria-selected="i === ci"
          :class="['char-tab hz', { on: i === ci }]" @click="ci = i"
        >{{ c.hz }}</button>
      </div>
      <div class="spacer" />
      <div class="meta">
        <span class="meta-py">{{ cur?.py }}</span>
        <span v-if="n" class="meta-n">{{ n }} nét</span>
      </div>
    </div>

    <p v-if="error" class="state">{{ error }}</p>
    <template v-else>
      <div class="grid-box">
        <svg viewBox="0 0 1024 1024" role="img" :aria-label="`Thứ tự nét chữ ${cur?.hz}`">
          <g class="guides">
            <line x1="0" y1="0" x2="1024" y2="1024" />
            <line x1="1024" y1="0" x2="0" y2="1024" />
            <line x1="512" y1="0" x2="512" y2="1024" />
            <line x1="0" y1="512" x2="1024" y2="512" />
          </g>
          <g transform="translate(0, 900) scale(1, -1)">
            <path v-for="(s, i) in bigStrokes" :key="i" :d="s.d" :fill="s.fill" />
            <template v-if="current">
              <clipPath :id="`${uid}-clip`"><path :d="current.stroke" /></clipPath>
              <path
                :key="animKey" class="draw" :d="current.d" :clip-path="`url(#${uid}-clip)`"
                :style="{ '--len': current.len }"
              />
            </template>
          </g>
        </svg>
      </div>

      <div class="controls">
        <button class="round" aria-label="Nét trước" :disabled="!data || step === 0" @click="prev"><AppIcon name="back" :size="18" /></button>
        <button class="play" :disabled="!data" @click="play"><AppIcon name="play" :size="16" /> Xem cách viết</button>
        <button class="round" aria-label="Nét tiếp" :disabled="!data || step >= n" @click="next"><AppIcon name="chevron" :size="18" /></button>
      </div>
      <div class="step-label" aria-live="polite">{{ data ? stepLabel : 'Đang tải…' }}</div>

      <div class="actions">
        <button :class="['opt', { on: rad }]" :aria-pressed="rad" :disabled="!radSet.size" @click="rad = !rad">
          <span class="swatch" /> Tô bộ thủ
        </button>
        <button class="opt" :disabled="!data" @click="practicing = true"><AppIcon name="pen" :size="16" /> Luyện viết</button>
      </div>

      <section v-if="seq.length" class="seq-wrap">
        <h2 class="section-title">Thứ tự nét</h2>
        <div class="seq">
          <button
            v-for="(q, i) in seq" :key="i" :class="['seq-cell', { on: i === step }]"
            :aria-label="`Nét ${q.no}`" @click="pick(i)"
          >
            <svg viewBox="0 0 1024 1024" aria-hidden="true">
              <g transform="translate(0, 900) scale(1, -1)">
                <path v-for="(s, j) in q.strokes" :key="j" :d="s.d" :fill="s.fill" />
              </g>
            </svg>
            <span class="seq-no">{{ q.no }}</span>
          </button>
        </div>
      </section>
    </template>

    <div class="credit">Dữ liệu nét viết: Make Me a Hanzi (hanzi-writer-data)</div>

    <PracticeSheet v-if="practicing" :char="cur.hz" :py="cur.py" @close="practicing = false" />
  </div>
</template>

<style scoped>
.so { display: flex; flex-direction: column; gap: 18px; }
.so-head { display: flex; align-items: center; gap: 8px; }
.char-tabs { display: flex; gap: 8px; flex-wrap: wrap; }
.char-tab {
  width: 52px; height: 52px; border-radius: 12px; cursor: pointer; font-size: 26px; font-weight: 500;
  border: 1px solid var(--border-2); background: var(--surface); color: var(--text);
}
.char-tab.on { border: 2px solid var(--accent); background: var(--accent-soft); }
.spacer { flex: 1; }
.meta { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
.meta-py { font-size: 15px; font-weight: 600; color: var(--accent-text); }
.meta-n { font-size: 13px; color: var(--muted); }

.grid-box {
  align-self: center; width: min(300px, 100%); aspect-ratio: 1; border: 1.5px solid var(--grid-border);
  border-radius: 6px; background: var(--grid-bg);
}
.grid-box svg { display: block; width: 100%; height: 100%; }
.guides line { stroke: var(--grid-line); stroke-width: 5; stroke-dasharray: 22 18; }
.draw {
  fill: none; stroke: var(--accent); stroke-width: 180; stroke-linecap: round; stroke-linejoin: round;
  stroke-dasharray: var(--len); stroke-dashoffset: var(--len); animation: draw 0.55s ease-in-out forwards;
}
@keyframes draw { to { stroke-dashoffset: 0; } }
@media (prefers-reduced-motion: reduce) { .draw { animation-duration: 0.01s; } }

.controls { display: flex; align-items: center; justify-content: center; gap: 12px; }
.round {
  width: 44px; height: 44px; border: 1px solid var(--border-2); border-radius: 22px; background: var(--surface);
  display: flex; align-items: center; justify-content: center; cursor: pointer;
}
.play {
  height: 48px; padding: 0 22px; border: none; border-radius: 24px; background: var(--accent); color: #fff;
  font-size: 15px; font-weight: 600; display: flex; align-items: center; gap: 8px; cursor: pointer;
}
button:disabled { opacity: 0.45; cursor: default; }
.step-label { text-align: center; font-size: 14px; color: var(--text-2); margin-top: -6px; }

.actions { display: flex; gap: 10px; }
.opt {
  flex: 1; height: 44px; border-radius: 12px; cursor: pointer; font-size: 14px; font-weight: 600;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  border: 1px solid var(--border-2); background: var(--surface); color: var(--text);
}
.opt.on { border: 2px solid var(--radical); background: var(--radical-soft); }
.swatch { width: 12px; height: 12px; border-radius: 3px; background: var(--radical); }

.seq-wrap { display: flex; flex-direction: column; gap: 10px; }
.seq { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 8px; }
.seq-cell {
  position: relative; aspect-ratio: 1; padding: 4px; cursor: pointer; border-radius: 8px;
  background: var(--grid-bg); border: 1px solid var(--border);
}
.seq-cell.on { border: 2px solid var(--accent); }
.seq-cell svg { display: block; width: 100%; height: 100%; }
.seq-no { position: absolute; left: 4px; top: 2px; font-size: 10px; font-weight: 600; color: var(--muted); }
.credit { font-size: 12px; color: var(--faint); }
</style>
