<script setup>
// Quick Vietnamese ⇄ Chinese translation with Gemini, laid out like Apple Translate: language
// pills with a swap button, one card with the source text on top and the translation below.
// The "Phồn thể" switch makes Vietnamese → Chinese output traditional characters.
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import AppIcon from '../components/AppIcon.vue'
import { errorLog, hasGeminiKey, translate } from '../lib/aiInfo.js'
import { getSetting, setSetting } from '../lib/settings.js'
import { canSpeak, speak } from '../lib/speech.js'

const DEBOUNCE_MS = 700
const from = ref('vi') // 'vi' | 'zh'
const traditional = ref(false)
const text = ref('')
const result = ref(null) // { text, pinyin }
const loading = ref(false)
const error = ref('')
const noKey = ref(false)
const copied = ref(false)
const input = ref(null)
let timer, seq = 0

const to = computed(() => (from.value === 'vi' ? 'zh' : 'vi'))
const zhName = computed(() => (traditional.value ? 'Tiếng Trung (Phồn thể)' : 'Tiếng Trung (Giản thể)'))
const langName = (l) => (l === 'vi' ? 'Tiếng Việt' : from.value === 'zh' ? 'Tiếng Trung' : zhName.value)
const pillName = (l) => (l === 'vi' ? 'Tiếng Việt' : from.value === 'zh' ? 'Tiếng Trung' : traditional.value ? 'Trung phồn thể' : 'Trung giản thể')
const zhVoice = computed(() => (traditional.value && from.value === 'vi' ? 'zh-TW' : 'zh-CN'))

onMounted(async () => {
  const [dir, trad] = await Promise.all([getSetting('translate_from'), getSetting('translate_trad')]).catch(() => [])
  if (dir === 'zh') from.value = 'zh'
  traditional.value = trad === '1'
  input.value?.focus()
})

async function run() {
  clearTimeout(timer)
  const q = text.value.trim()
  const mine = ++seq
  error.value = ''
  if (!q) { result.value = null; loading.value = false; return }
  if (!(await hasGeminiKey())) { noKey.value = true; return }
  noKey.value = false
  loading.value = true
  try {
    const r = await translate(q, { from: from.value, traditional: traditional.value })
    if (mine === seq) result.value = r
  } catch (e) {
    console.debug('Translate failed', e)
    if (mine === seq) { result.value = null; error.value = errorLog(e) }
  } finally {
    if (mine === seq) loading.value = false
  }
}

watch(text, () => {
  autosize()
  clearTimeout(timer)
  if (!text.value.trim()) return run()
  timer = setTimeout(run, DEBOUNCE_MS)
})
watch(traditional, (v) => {
  setSetting('translate_trad', v ? '1' : '').catch(() => {})
  if (from.value === 'vi') run()
})

function swap() {
  const carried = result.value?.text
  from.value = to.value
  setSetting('translate_from', from.value).catch(() => {})
  result.value = null
  if (carried) text.value = carried
  else run()
}

function onEnter(e) {
  if (e.shiftKey || e.isComposing) return
  e.preventDefault()
  run()
  input.value?.blur()
}

function clear() {
  text.value = ''
  input.value?.focus()
}

async function copy() {
  try {
    await navigator.clipboard.writeText(result.value.text)
    copied.value = true
    setTimeout(() => { copied.value = false }, 1500)
  } catch {}
}

function autosize() {
  nextTick(() => {
    const el = input.value
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  })
}
</script>

<template>
  <div class="screen with-tabbar translate">
    <h1 class="large-title">Dịch</h1>

    <div class="langs">
      <span class="lang-pill">{{ pillName(from) }}</span>
      <button class="swap" aria-label="Đổi chiều dịch" @click="swap"><AppIcon name="swap" :size="20" :stroke-width="2" /></button>
      <span class="lang-pill">{{ pillName(to) }}</span>
    </div>

    <div class="card">
      <section class="src">
        <div class="lang-label">{{ langName(from) }}</div>
        <textarea
          ref="input" v-model="text" rows="2" :class="{ hz: from === 'zh' }" enterkeyhint="go"
          :placeholder="from === 'vi' ? 'Nhập văn bản tiếng Việt' : '输入中文（简体或繁體）'"
          :aria-label="`Văn bản ${langName(from)}`" autocapitalize="sentences" spellcheck="false"
          @keydown.enter="onEnter"
        />
        <div v-if="text" class="actions">
          <div v-if="from === 'zh' && result?.pinyin" class="src-py">{{ result.pinyin }}</div>
          <span class="spacer" />
          <button v-if="canSpeak" class="icon-btn" aria-label="Phát âm văn bản gốc" @click="speak(text, from === 'vi' ? 'vi-VN' : 'zh-CN')"><AppIcon name="sound" :size="20" /></button>
          <button class="icon-btn" aria-label="Xóa văn bản" @click="clear"><AppIcon name="close" :size="20" /></button>
        </div>
      </section>

      <section v-if="text.trim()" class="dst" aria-live="polite">
        <div class="lang-label accent">{{ langName(to) }}</div>
        <div v-if="noKey" class="notice">
          Cần Gemini key để dịch. <RouterLink :to="{ name: 'settings' }">Thêm key trong Cài đặt</RouterLink>
        </div>
        <pre v-else-if="error" class="ai-log" role="status">{{ error }}</pre>
        <div v-else-if="loading && !result" class="skeleton"><span /><span class="short" /></div>
        <template v-else-if="result">
          <p :class="['out', { hz: to === 'zh', stale: loading }]">{{ result.text }}</p>
          <div v-if="to === 'zh' && result.pinyin" class="dst-py">{{ result.pinyin }}</div>
          <div class="actions">
            <span class="spacer" />
            <button v-if="canSpeak" class="icon-btn" aria-label="Phát âm bản dịch" @click="speak(result.text, to === 'vi' ? 'vi-VN' : zhVoice)"><AppIcon name="sound" :size="20" /></button>
            <button class="icon-btn" :aria-label="copied ? 'Đã sao chép' : 'Sao chép bản dịch'" @click="copy"><AppIcon :name="copied ? 'check' : 'copy'" :size="20" /></button>
          </div>
        </template>
      </section>
    </div>

    <div class="group switch-row">
      <label for="trad-switch">Dịch sang chữ phồn thể</label>
      <input id="trad-switch" v-model="traditional" type="checkbox" role="switch" class="switch" />
    </div>
    <p class="group-footer">Áp dụng khi dịch từ tiếng Việt sang tiếng Trung. Khi dịch sang tiếng Việt, nhập chữ giản thể hay phồn thể đều được.</p>
  </div>
</template>

<style scoped>
.translate { padding: 32px 16px 0; }
.translate .large-title { padding: 0 4px; }
.langs { display: flex; align-items: center; gap: 8px; margin: 18px 0 14px; }
.lang-pill {
  flex: 1; min-width: 0; height: 40px; line-height: 40px; border-radius: 999px; background: var(--surface); padding: 0 12px;
  text-align: center; font-size: 15px; font-weight: 600; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.swap {
  width: 40px; height: 40px; flex-shrink: 0; border: none; border-radius: 999px; background: var(--surface);
  color: var(--accent-text); display: flex; align-items: center; justify-content: center; cursor: pointer; padding: 0;
}
.card { background: var(--surface); border-radius: 18px; overflow: hidden; }
.src, .dst { padding: 14px 16px 6px; display: flex; flex-direction: column; gap: 6px; }
.dst { border-top: 0.5px solid var(--divider); }
.lang-label { font-size: 13px; font-weight: 600; color: var(--muted); }
.lang-label.accent { color: var(--accent-text); }
textarea {
  width: 100%; min-height: 64px; border: none; outline: none; resize: none; background: none; padding: 0; margin: 0;
  font: inherit; font-size: 22px; line-height: 1.4; color: var(--text); overflow: hidden;
}
textarea.hz { font-family: var(--hz); }
textarea::placeholder { color: var(--chevron); }
.out { margin: 0; font-size: 22px; line-height: 1.4; color: var(--accent); white-space: pre-wrap; word-break: break-word; transition: opacity 0.15s; }
.out.hz { font-family: var(--hz); }
.out.stale { opacity: 0.5; }
.src-py, .dst-py { font-size: 15px; line-height: 1.45; color: var(--accent-text); }
.src-py { flex: 1; min-width: 0; }
.actions { display: flex; align-items: center; gap: 2px; margin-right: -8px; min-height: 44px; }
.actions .spacer { flex: 1; }
.actions .src-py + .spacer { display: none; }
.actions .icon-btn { color: var(--accent-text); }
.notice { font-size: 15px; line-height: 1.45; padding-bottom: 10px; }
.ai-log {
  margin: 0 0 10px; padding: 10px 12px; border-radius: 10px; background: #FFF1F0; color: var(--danger);
  font: 12px/1.45 ui-monospace, SFMono-Regular, Menlo, monospace; white-space: pre-wrap; word-break: break-word;
  max-height: 240px; overflow: auto; user-select: text; -webkit-user-select: text;
}
.skeleton { display: flex; flex-direction: column; gap: 10px; padding: 6px 0 16px; }
.skeleton span { height: 16px; border-radius: 8px; background: var(--chip); animation: pulse 1.2s ease-in-out infinite; }
.skeleton .short { width: 55%; }
@keyframes pulse { 50% { opacity: 0.5; } }
@media (prefers-reduced-motion: reduce) { .skeleton span { animation: none; } }
.switch-row { margin-top: 20px; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 0 16px; min-height: 52px; }
.switch-row label { font-size: 17px; }
.switch {
  appearance: none; -webkit-appearance: none; position: relative; flex-shrink: 0; width: 51px; height: 31px; margin: 0;
  border-radius: 999px; background: #E9E9EA; cursor: pointer; transition: background-color 0.2s;
}
.switch::after {
  content: ''; position: absolute; top: 2px; left: 2px; width: 27px; height: 27px; border-radius: 50%; background: #fff;
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.15), 0 1px 1px rgba(0, 0, 0, 0.16); transition: transform 0.2s;
}
.switch:checked { background: #34C759; }
.switch:checked::after { transform: translateX(20px); }
.switch:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
</style>
