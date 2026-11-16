<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import HanziWriter from 'hanzi-writer'
import AppIcon from './AppIcon.vue'
import { loadStrokes } from '../lib/strokes.js'

const props = defineProps({ char: { type: String, required: true }, py: { type: String, default: '' } })
const emit = defineEmits(['close'])

const target = ref(null)
const outline = ref(true)
const mistakes = ref(0)
const done = ref(false)
const total = ref(0)
const drawn = ref(0)
let writer = null

function start() {
  mistakes.value = 0
  drawn.value = 0
  done.value = false
  writer.quiz({
    onCorrectStroke: (d) => { drawn.value = d.strokeNum + 1 },
    onMistake: () => { mistakes.value++ },
    onComplete: (d) => { done.value = true; mistakes.value = d.totalMistakes },
  })
}

function toggleOutline() {
  outline.value = !outline.value
  outline.value ? writer.showOutline() : writer.hideOutline()
}

function onKey(e) {
  if (e.key === 'Escape') emit('close')
}

function onBack(e) {
  e.preventDefault()
  emit('close')
}

onMounted(async () => {
  document.addEventListener('keydown', onKey)
  window.addEventListener('app-back', onBack)
  const size = Math.min(300, target.value.clientWidth)
  writer = HanziWriter.create(target.value, props.char, {
    width: size,
    height: size,
    padding: 12,
    showCharacter: false,
    showOutline: true,
    strokeColor: '#17171A',
    outlineColor: '#E6E6E2',
    drawingColor: '#C2272D',
    highlightColor: '#1F5FBF',
    drawingWidth: 28,
    showHintAfterMisses: 3,
    charDataLoader: (c, onLoad, onError) => loadStrokes(c).then(onLoad, onError),
  })
  const data = await loadStrokes(props.char)
  total.value = data.strokes.length
  start()
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKey)
  window.removeEventListener('app-back', onBack)
  writer?.cancelQuiz()
})
</script>

<template>
  <div class="backdrop" @click.self="emit('close')">
    <div class="sheet" role="dialog" aria-modal="true" :aria-label="`Luyện viết chữ ${char}`">
      <div class="sheet-head">
        <div>
          <div class="title">Luyện viết <span class="hz">{{ char }}</span></div>
          <div class="sub">{{ py }} · viết từng nét theo đúng thứ tự</div>
        </div>
        <button class="icon-btn" aria-label="Đóng" @click="emit('close')"><AppIcon name="close" /></button>
      </div>

      <div class="pad">
        <svg class="guides" viewBox="0 0 1024 1024" aria-hidden="true">
          <line x1="0" y1="0" x2="1024" y2="1024" />
          <line x1="1024" y1="0" x2="0" y2="1024" />
          <line x1="512" y1="0" x2="512" y2="1024" />
          <line x1="0" y1="512" x2="1024" y2="512" />
        </svg>
        <div ref="target" class="writer" />
      </div>

      <div class="status" aria-live="polite">
        <template v-if="done">
          <AppIcon name="check" :size="18" /> Hoàn thành!
          {{ mistakes ? `${mistakes} lần sai` : 'Không sai nét nào' }}
        </template>
        <template v-else>Nét {{ Math.min(drawn + 1, total) }} / {{ total }} · {{ mistakes }} lần sai</template>
      </div>

      <div class="actions">
        <button class="opt" :aria-pressed="outline" @click="toggleOutline">
          <AppIcon name="eye" :size="16" /> {{ outline ? 'Ẩn chữ mờ' : 'Hiện chữ mờ' }}
        </button>
        <button class="opt primary" @click="start"><AppIcon name="refresh" :size="16" /> Viết lại</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.backdrop {
  position: fixed; inset: 0; z-index: 50; background: rgba(23, 23, 26, 0.45);
  display: flex; align-items: flex-end; justify-content: center;
}
.sheet {
  width: 100%; max-width: 520px; background: var(--surface); border-radius: 24px 24px 0 0;
  padding: 16px 20px calc(24px + var(--sab)); display: flex; flex-direction: column; gap: 16px;
}
.sheet-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.title { font-size: 18px; font-weight: 700; }
.sub { font-size: 14px; color: var(--muted); margin-top: 2px; }
.pad {
  position: relative; align-self: center; width: min(300px, 100%); aspect-ratio: 1;
  border: 1.5px solid var(--grid-border); border-radius: 6px; background: var(--grid-bg); touch-action: none;
}
.guides { position: absolute; inset: 0; width: 100%; height: 100%; }
.guides line { stroke: var(--grid-line); stroke-width: 5; stroke-dasharray: 22 18; }
.writer { position: absolute; inset: 0; }
.status { display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 14px; color: var(--text-2); }
.actions { display: flex; gap: 10px; }
.opt {
  flex: 1; height: 44px; border-radius: 12px; cursor: pointer; font-size: 14px; font-weight: 600;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  border: 1px solid var(--border-2); background: var(--surface); color: var(--text);
}
.opt.primary { background: var(--accent); border-color: var(--accent); color: #fff; }
</style>
