<script setup>
// Quick Vietnamese ⇄ Chinese translation with Gemini, laid out like Apple Translate: one card with
// the source text on top and the translation below. Gemini detects the language: Chinese goes to
// Vietnamese, anything else to Chinese. The "phồn thể" switch makes Chinese output traditional.
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import AppIcon from '../components/AppIcon.vue'
import { errorLog, hasGeminiKey, translate } from '../lib/aiInfo.js'
import { getSetting, setSetting } from '../lib/settings.js'
import { canSpeak, speak } from '../lib/speech.js'

const DEBOUNCE_MS = 700
const traditional = ref(false)
const text = ref('')
const result = ref(null) // { text, pinyin }
const loading = ref(false)
const error = ref('')
const noKey = ref(false)
const copied = ref(false)
const input = ref(null)
let timer, seq = 0

// Detected by Gemini once translated; until then a guess from the script used.
const from = computed(() => result.value?.source || (/\p{Script=Han}/u.test(text.value) ? 'zh' : 'vi'))
const to = computed(() => (from.value === 'vi' ? 'zh' : 'vi'))
const voice = (lang) => (lang === 'vi' ? 'vi-VN' : lang === to.value && traditional.value ? 'zh-TW' : 'zh-CN')

onMounted(async () => {
  traditional.value = (await getSetting('translate_trad').catch(() => null)) === '1'
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
    const r = await translate(q, { traditional: traditional.value })
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

    <div class="card">
      <section class="src">
        <textarea
          ref="input" v-model="text" rows="2" :class="{ hz: from === 'zh' }" enterkeyhint="go"
          placeholder="Nhập tiếng Việt hoặc tiếng Trung"
          aria-label="Văn bản cần dịch" autocapitalize="sentences" spellcheck="false"
          @keydown.enter="onEnter"
        />
        <div v-if="text" class="actions">
          <div v-if="from === 'zh' && result?.pinyin" class="src-py">{{ result.pinyin }}</div>
          <span class="spacer" />
          <button v-if="canSpeak" class="icon-btn" aria-label="Phát âm văn bản gốc" @click="speak(text, voice(from))"><AppIcon name="sound" :size="20" /></button>
          <button class="icon-btn" aria-label="Xóa văn bản" @click="clear"><AppIcon name="close" :size="20" /></button>
        </div>
      </section>

      <section v-if="text.trim()" class="dst" aria-live="polite">
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
            <button v-if="canSpeak" class="icon-btn" aria-label="Phát âm bản dịch" @click="speak(result.text, voice(to))"><AppIcon name="sound" :size="20" /></button>
            <button class="icon-btn" :aria-label="copied ? 'Đã sao chép' : 'Sao chép bản dịch'" @click="copy"><AppIcon :name="copied ? 'check' : 'copy'" :size="20" /></button>
          </div>
        </template>
      </section>
    </div>

    <div class="group switch-row">
      <label for="trad-switch">Dịch sang chữ phồn thể</label>
      <input id="trad-switch" v-model="traditional" type="checkbox" role="switch" class="switch" />
    </div>
    <p class="group-footer">Ngôn ngữ được AI tự nhận diện: tiếng Trung (giản thể hay phồn thể) dịch sang tiếng Việt, tiếng Việt dịch sang tiếng Trung. Công tắc chỉ áp dụng khi dịch sang tiếng Trung.</p>
  </div>
</template>

<style scoped>
.translate { padding: 32px 16px 0; }
.translate .large-title { padding: 0 4px; }
.card { margin-top: 18px; background: var(--surface); border-radius: 18px; overflow: hidden; }
.src, .dst { padding: 16px 16px 6px; display: flex; flex-direction: column; gap: 6px; }
.dst { border-top: 0.5px solid var(--divider); }
textarea {
  width: 100%; min-height: 168px; border: none; outline: none; resize: none; background: none; padding: 0; margin: 0;
  font: inherit; font-size: 22px; line-height: 1.4; color: var(--text); overflow: hidden;
}
textarea.hz { font-family: var(--hz); }
textarea::placeholder { color: var(--chevron); font-size: 17px; }
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
.switch-row { margin-top: 20px; }
</style>
