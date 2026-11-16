<script setup>
// Free text that is not in the dictionary (usually a whole sentence): Gemini translates it and
// breaks it down word by word. Cached in SQLite; unlike the word screen there is no local data,
// so a missing key or a failed call is shown.
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '../components/AppIcon.vue'
import { errorLog, fetchSentence, getCachedSentenceInfo, hasGeminiKey } from '../lib/aiInfo.js'
import { dictReady, getWord } from '../lib/dict.js'
import { canSpeak, speak } from '../lib/speech.js'

const route = useRoute()
const router = useRouter()
const text = computed(() => String(route.query.q || '').trim())
const info = ref(null)
const state = ref('loading') // loading | nokey | error | ready
const error = ref('')
const refreshing = ref(false)
const inDict = ref(new Set())
let shown = 0 // bumps on every result shown, so a late dictionary check never marks a newer result

const isHan = computed(() => /\p{Script=Han}/u.test(text.value))

// Only words that exist in the dictionary link to the word screen.
async function markDictWords(r, mine) {
  await dictReady
  const found = await Promise.all(r.words.map((w) => getWord(w.zh).then((x) => (x ? w.zh : null)).catch(() => null)))
  if (mine === shown) inDict.value = new Set(found.filter(Boolean))
}

function show(r) {
  info.value = r
  state.value = 'ready'
  markDictWords(r, ++shown)
}

async function load() {
  const q = text.value
  info.value = null
  error.value = ''
  inDict.value = new Set()
  shown++
  if (!q) return
  state.value = 'loading'
  const cached = await getCachedSentenceInfo(q)
  if (text.value !== q) return
  if (cached) return show(cached)
  if (!(await hasGeminiKey())) { state.value = 'nokey'; return }
  try {
    const r = await fetchSentence(q)
    if (text.value === q) show(r)
  } catch (e) {
    if (text.value !== q) return
    error.value = reasonText(e)
    state.value = 'error'
  }
}
watch(text, load, { immediate: true })

const reasonText = (e) => `Không dịch được câu này.\n${errorLog(e)}`

// Refresh: fetch again and overwrite the cache; on failure keep the old result and say so.
async function refresh() {
  const q = text.value
  if (refreshing.value) return
  refreshing.value = true
  error.value = ''
  try {
    const r = await fetchSentence(q)
    if (text.value === q) show(r)
  } catch (e) {
    if (text.value === q) error.value = reasonText(e)
  } finally {
    refreshing.value = false
  }
}

const goWord = (w) => ({ name: 'word', params: { w } })
</script>

<template>
  <div class="screen with-tabbar sentence">
    <header class="sentence-header">
      <button class="round-btn" aria-label="Quay lại" @click="router.back()"><AppIcon name="back" :stroke-width="2.2" /></button>
    </header>

    <section class="hero">
      <h1 :class="['hero-text', { hz: isHan }]">{{ text }}</h1>
      <p class="hero-sub">Không có trong từ điển · dịch và phân tích bằng AI</p>
    </section>

    <div class="body">
      <section v-if="state === 'loading'" aria-busy="true" aria-label="Đang dịch bằng AI">
        <h2 class="group-header ai-title"><AppIcon name="sparkle" :size="14" /> Bản dịch</h2>
        <div class="group card-pad skeleton"><span /><span /><span class="short" /></div>
      </section>

      <div v-else-if="state === 'nokey'" class="group card-pad notice">
        <p>Cần Gemini key để dịch và phân tích câu.</p>
        <RouterLink :to="{ name: 'settings' }" class="notice-btn">Thêm key trong Cài đặt</RouterLink>
      </div>

      <div v-else-if="state === 'error'" class="group card-pad notice">
        <pre class="ai-log" role="status">{{ error }}</pre>
        <button class="notice-btn" @click="load">Thử lại</button>
      </div>

      <template v-else-if="info">
        <section>
          <div class="ai-head">
            <h2 class="group-header ai-title"><AppIcon name="sparkle" :size="14" /> Bản dịch</h2>
            <button
              :class="['ai-refresh', { spinning: refreshing }]" :disabled="refreshing"
              :aria-label="refreshing ? 'Đang làm mới' : 'Làm mới từ Gemini'" @click="refresh"
            ><AppIcon name="refresh" :size="18" /></button>
          </div>
          <div class="group card-pad translation">
            <pre v-if="error" class="ai-log" role="status">{{ error }}</pre>
            <div class="zh-row">
              <div class="hz zh">{{ info.chinese }}</div>
              <button v-if="canSpeak" class="icon-btn" aria-label="Phát âm" @click="speak(info.chinese)"><AppIcon name="sound" :size="20" /></button>
            </div>
            <div class="py">{{ info.pinyin }}</div>
            <div class="vi">{{ info.vietnamese }}</div>
          </div>
        </section>

        <section v-if="info.words.length">
          <h2 class="group-header">Phân tích từng từ</h2>
          <div class="group">
            <component
              :is="inDict.has(w.zh) ? 'RouterLink' : 'div'" v-for="(w, i) in info.words" :key="i"
              :to="inDict.has(w.zh) ? goWord(w.zh) : undefined" class="row-link word-row"
            >
              <span class="row-hz">{{ w.zh }}</span>
              <span class="row-body">
                <span class="row-py">{{ w.py }}</span>
                <span class="word-vi">{{ w.vi }}</span>
              </span>
              <AppIcon v-if="inDict.has(w.zh)" name="chevron" :size="14" :stroke-width="2.6" style="color: var(--chevron); flex-shrink: 0" />
            </component>
          </div>
        </section>

        <section v-if="info.grammar.length">
          <h2 class="group-header">Ngữ pháp</h2>
          <div class="group card-pad grammar">
            <div v-for="(g, i) in info.grammar" :key="i" class="grammar-item">
              <div class="hz grammar-title">{{ g.title }}</div>
              <div class="grammar-explain">{{ g.explain }}</div>
            </div>
          </div>
        </section>
      </template>
    </div>
  </div>
</template>

<style scoped>
.sentence-header { display: flex; align-items: center; padding: 12px 16px 0; }
.hero { padding: 18px 24px 8px; display: flex; flex-direction: column; gap: 6px; }
.hero-text { margin: 0; font-size: 26px; font-weight: 600; line-height: 1.35; word-break: break-word; }
.hero-text.hz { font-weight: 500; }
.hero-sub { margin: 0; font-size: 13px; color: var(--muted); }
.body { padding: 0 16px; display: flex; flex-direction: column; }
.card-pad { padding: 14px 16px; }
.ai-title { display: flex; align-items: center; gap: 6px; }
.ai-head { display: flex; align-items: flex-end; justify-content: space-between; }
.ai-head .group-header { margin-bottom: 8px; }
.ai-refresh {
  width: 44px; height: 44px; margin: 0 -6px 0 0; border: none; background: none; color: var(--accent-text);
  display: flex; align-items: center; justify-content: center; cursor: pointer; padding: 0;
}
.ai-refresh:disabled { cursor: default; }
.ai-refresh.spinning svg { animation: spin 0.9s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.ai-log {
  margin: 0; padding: 10px 12px; border-radius: 10px; background: #FFF1F0; color: var(--danger); align-self: stretch;
  font: 12px/1.45 ui-monospace, SFMono-Regular, Menlo, monospace; white-space: pre-wrap; word-break: break-word;
  max-height: 240px; overflow: auto; user-select: text; -webkit-user-select: text;
}
.translation { display: flex; flex-direction: column; gap: 6px; }
.zh-row { display: flex; align-items: flex-start; gap: 8px; justify-content: space-between; }
.zh { font-size: 22px; line-height: 1.45; }
.zh-row .icon-btn { flex-shrink: 0; margin: -4px -8px 0 0; color: var(--accent-text); }
.py { font-size: 15px; color: var(--accent-text); line-height: 1.45; }
.vi { font-size: 16px; color: var(--text); line-height: 1.5; padding-top: 6px; border-top: 0.5px solid var(--divider); margin-top: 4px; }
.word-row { color: var(--text); }
.word-vi { font-size: 15px; color: var(--text-2); line-height: 1.4; }
.grammar { display: flex; flex-direction: column; gap: 12px; }
.grammar-item + .grammar-item { padding-top: 12px; border-top: 0.5px solid var(--divider); }
.grammar-title { font-size: 16px; font-weight: 600; color: var(--accent-text); }
.grammar-explain { font-size: 15px; line-height: 1.5; color: var(--text-2); margin-top: 3px; }
.notice { display: flex; flex-direction: column; align-items: flex-start; gap: 12px; margin-top: 16px; }
.notice p { margin: 0; font-size: 15px; line-height: 1.45; }
.notice-btn {
  border: none; border-radius: 12px; background: var(--accent-soft); color: var(--accent); padding: 10px 16px;
  font-size: 15px; font-weight: 600; cursor: pointer;
}
.skeleton { display: flex; flex-direction: column; gap: 10px; }
.skeleton span { height: 14px; border-radius: 7px; background: var(--chip); animation: pulse 1.2s ease-in-out infinite; }
.skeleton .short { width: 60%; }
@keyframes pulse { 50% { opacity: 0.5; } }
@media (prefers-reduced-motion: reduce) { .skeleton span, .ai-refresh.spinning svg { animation: none; } }
</style>
