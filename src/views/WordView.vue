<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '../components/AppIcon.vue'
import StrokeOrder from '../components/StrokeOrder.vue'
import { dictReady, getWord } from '../lib/dict.js'
import { segments } from '../lib/refs.js'
import { canSpeak, speak } from '../lib/speech.js'
import { isSaved, pushHistory, toggleSaved } from '../lib/storage.js'

const route = useRoute()
const router = useRouter()
const word = ref(null)
const loading = ref(true)
const copied = ref(false)
const showAllCompounds = ref(false)

const tab = computed(() => (route.query.tab === 'write' ? 'write' : 'meaning'))
const setTab = (t) => router.replace({ query: { ...route.query, tab: t === 'meaning' ? undefined : t } })

async function load() {
  const w = String(route.params.w || '')
  loading.value = true
  showAllCompounds.value = false
  await dictReady
  const r = await getWord(w)
  if (String(route.params.w) !== w) return
  word.value = r
  loading.value = false
  if (r) pushHistory({ type: 'word', s: r.s, py: r.entries[0].py })
}
watch(() => route.params.w, (w) => w && load(), { immediate: true })

const head = computed(() => word.value?.entries[0])
const readings = computed(() => [...new Set(word.value?.entries.map((e) => e.py) || [])])
const saved = computed(() => word.value && isSaved(word.value.s))
const multi = computed(() => (word.value?.entries.length || 0) > 1)

// Characters for the writing tab: from the "Từng chữ" breakdown, or the word itself if it is one character.
const writeChars = computed(() => {
  if (!word.value) return []
  if (word.value.chars.length) return word.value.chars.map((c) => ({ hz: c.s, py: c.py }))
  return [...word.value.s].filter((c) => /\p{Script=Han}/u.test(c)).map((hz) => ({ hz, py: head.value.py }))
})

const compounds = computed(() => (showAllCompounds.value ? word.value.compounds : word.value.compounds.slice(0, 8)))

function toggleSave() {
  toggleSaved({ s: word.value.s, py: head.value.py, def: head.value.meanings.slice(0, 2).join('; ') })
}

async function copy() {
  try {
    await navigator.clipboard.writeText(word.value.s)
    copied.value = true
    setTimeout(() => { copied.value = false }, 1500)
  } catch {}
}

const goWord = (w) => ({ name: 'word', params: { w } })

/** Highlights the headword inside an example phrase. */
function splitOn(text, w) {
  const i = text.indexOf(w)
  return i < 0 ? [text, '', ''] : [text.slice(0, i), w, text.slice(i + w.length)]
}
</script>

<template>
  <div class="screen word">
    <header class="word-header">
      <button class="icon-btn" aria-label="Quay lại" @click="router.back()"><AppIcon name="back" /></button>
      <div v-if="word" class="header-actions">
        <button class="icon-btn" :aria-label="saved ? 'Bỏ lưu từ' : 'Lưu từ'" :aria-pressed="saved" @click="toggleSave">
          <AppIcon :name="saved ? 'bookmark-filled' : 'bookmark'" :style="saved ? 'color: var(--accent)' : ''" />
        </button>
        <button class="icon-btn" :aria-label="copied ? 'Đã sao chép' : 'Sao chép'" @click="copy">
          <AppIcon :name="copied ? 'check' : 'copy'" :size="20" />
        </button>
      </div>
    </header>

    <p v-if="loading" class="state">Đang tải…</p>
    <div v-else-if="!word" class="state">
      Không tìm thấy “{{ route.params.w }}” trong từ điển.
      <div><RouterLink :to="{ name: 'search', query: { q: route.params.w } }">Tìm gần đúng</RouterLink></div>
    </div>

    <template v-else>
      <section class="hero">
        <div class="hero-row">
          <h1 class="hz hero-hz">{{ word.s }}</h1>
          <div v-if="word.t !== word.s" class="trad">
            <span class="trad-label">Phồn thể</span>
            <span class="hz trad-hz">{{ word.t }}</span>
          </div>
        </div>
        <div class="py-row">
          <span class="hero-py">{{ readings.join(' · ') }}</span>
          <button v-if="canSpeak" class="speak" aria-label="Phát âm" @click="speak(word.s)"><AppIcon name="sound" :size="20" /></button>
        </div>
      </section>

      <div class="panel">
        <div class="tabs" role="tablist">
          <button role="tab" :aria-selected="tab === 'meaning'" :class="['tab', { on: tab === 'meaning' }]" @click="setTab('meaning')">Ý nghĩa</button>
          <button role="tab" :aria-selected="tab === 'write'" :class="['tab', { on: tab === 'write' }]" @click="setTab('write')">Cách viết</button>
        </div>

        <div v-if="tab === 'meaning'" class="panel-body">
          <section v-for="e in word.entries" :key="e.id" class="block">
            <h2 class="section-title">
              Nghĩa<template v-if="multi"> · <span class="reading">{{ e.py }}</span><span v-if="e.t !== word.t" class="hz"> ({{ e.t }})</span></template>
            </h2>
            <ol class="meanings">
              <li v-for="(m, i) in e.meanings" :key="i">
                <span class="num">{{ i + 1 }}</span>
                <span>
                  <template v-for="(sg, k) in segments(m)" :key="k">
                    <RouterLink v-if="sg.hz" :to="goWord(sg.hz)" class="ref"><span class="hz">{{ sg.hz }}</span> <span class="ref-py">{{ sg.py }}</span></RouterLink>
                    <template v-else>{{ sg.text }}</template>
                  </template>
                </span>
              </li>
            </ol>
            <div v-if="e.measure.length" class="measure">
              <span class="measure-label">Lượng từ</span>
              <template v-for="(mw, i) in e.measure" :key="i">
                <template v-for="(sg, k) in segments(mw)" :key="k">
                  <RouterLink v-if="sg.hz" :to="goWord(sg.hz)" class="ref"><span class="hz">{{ sg.hz }}</span> <span class="ref-py">{{ sg.py }}</span></RouterLink>
                  <template v-else>{{ sg.text }}</template>
                </template>
              </template>
            </div>
          </section>

          <section v-if="word.chars.length" class="block">
            <h2 class="section-title">Từng chữ</h2>
            <div class="char-grid">
              <RouterLink v-for="c in word.chars" :key="c.id" :to="goWord(c.s)" class="char-card">
                <span class="char-top"><span class="hz char-hz">{{ c.s }}</span><span class="char-py">{{ c.py }}</span></span>
                <span class="char-def">{{ c.def }}</span>
              </RouterLink>
            </div>
          </section>

          <section v-if="word.phrases.length" class="block">
            <h2 class="section-title">Câu / thành ngữ gợi ý</h2>
            <RouterLink v-for="p in word.phrases" :key="p.id" :to="goWord(p.s)" class="phrase">
              <div class="hz phrase-hz">{{ splitOn(p.s, word.s)[0] }}<span class="phrase-hit">{{ splitOn(p.s, word.s)[1] }}</span>{{ splitOn(p.s, word.s)[2] }}</div>
              <div class="phrase-py">{{ p.py }}</div>
              <div class="phrase-def">{{ p.def }}</div>
            </RouterLink>
          </section>

          <section v-if="word.compounds.length" class="block tight">
            <h2 class="section-title compounds-title">Từ ghép chứa {{ word.s }} <span class="count">{{ word.compoundsTotal }}</span></h2>
            <RouterLink v-for="c in compounds" :key="c.id" :to="goWord(c.s)" class="compound">
              <span class="hz compound-hz">{{ c.s }}</span>
              <span class="compound-body">
                <span class="compound-py">{{ c.py }}</span>
                <span class="compound-def">{{ c.def }}</span>
              </span>
              <AppIcon name="chevron" :size="16" style="color: var(--chevron); flex-shrink: 0" />
            </RouterLink>
            <button v-if="!showAllCompounds && word.compounds.length > 8" class="more" @click="showAllCompounds = true">
              Xem thêm {{ word.compounds.length - 8 }} từ
            </button>
          </section>

          <div class="credit">Nguồn: CVDICT · CC BY-SA 4.0</div>
        </div>

        <div v-else class="panel-body write">
          <StrokeOrder v-if="writeChars.length" :chars="writeChars" />
          <p v-else class="state">Từ này không có chữ Hán để luyện viết.</p>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.word-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 12px 0; }
.header-actions { display: flex; gap: 4px; }
.hero { padding: 8px 24px 20px; display: flex; flex-direction: column; gap: 10px; }
.hero-row { display: flex; align-items: flex-end; gap: 14px; flex-wrap: wrap; }
.hero-hz { margin: 0; font-size: 64px; font-weight: 500; line-height: 1.05; letter-spacing: 0.02em; word-break: break-all; }
.trad { display: flex; flex-direction: column; gap: 2px; padding-bottom: 8px; }
.trad-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted); }
.trad-hz { font-size: 20px; color: var(--text-2); }
.py-row { display: flex; align-items: center; gap: 10px; }
.hero-py { font-size: 22px; font-weight: 500; color: var(--accent); }
.speak {
  width: 44px; height: 44px; border: none; border-radius: 22px; background: var(--accent-soft); color: var(--accent-text);
  display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0;
}

.panel { flex: 1; background: var(--surface); border-radius: 24px 24px 0 0; border-top: 1px solid var(--border); display: flex; flex-direction: column; }
.tabs { display: flex; padding: 0 24px; border-bottom: 1px solid var(--divider); position: sticky; top: var(--sat); background: var(--surface); border-radius: 24px 24px 0 0; z-index: 2; }
.tab {
  flex: 1; height: 48px; border: none; background: transparent; cursor: pointer; font-size: 15px; font-weight: 500;
  color: var(--muted); border-bottom: 2.5px solid transparent; margin-bottom: -1px;
}
.tab.on { font-weight: 600; color: var(--text); border-bottom-color: var(--accent); }
.panel-body { padding: 24px 24px 32px; display: flex; flex-direction: column; gap: 28px; }
.panel-body.write { padding-top: 20px; }

.block { display: flex; flex-direction: column; gap: 12px; }
.block.tight { gap: 4px; }
.reading { text-transform: none; letter-spacing: 0; color: var(--accent-text); }
.meanings { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 10px; }
.meanings li { display: flex; gap: 12px; font-size: 17px; line-height: 1.45; }
.num {
  width: 24px; height: 24px; flex-shrink: 0; border-radius: 12px; background: var(--chip); color: var(--text-2);
  font-size: 13px; font-weight: 600; display: flex; align-items: center; justify-content: center; margin-top: 1px;
}
.ref { color: var(--text); border-bottom: 1px dashed var(--grid-border); }
.ref-py { color: var(--accent-text); font-size: 0.9em; }
.measure { font-size: 15px; color: var(--text-2); display: flex; flex-wrap: wrap; gap: 6px; align-items: baseline; }
.measure-label { font-size: 12px; font-weight: 600; color: var(--muted); background: var(--chip); border-radius: 6px; padding: 2px 8px; }

.char-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.char-card { display: flex; flex-direction: column; gap: 4px; padding: 14px; border: 1px solid var(--border); border-radius: 14px; color: var(--text); }
.char-card:hover { border-color: var(--border-2); }
.char-top { display: flex; align-items: baseline; gap: 8px; }
.char-hz { font-size: 30px; font-weight: 500; line-height: 1.1; }
.char-py { font-size: 14px; color: var(--accent-text); font-weight: 500; }
.char-def { font-size: 14px; color: var(--text-2); line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

.phrase { display: flex; flex-direction: column; gap: 6px; padding: 16px; background: var(--surface-2); border-radius: 14px; color: var(--text); }
.phrase-hz { font-size: 20px; line-height: 1.4; }
.phrase-hit { color: var(--accent); font-weight: 700; }
.phrase-py { font-size: 14px; color: var(--accent-text); }
.phrase-def { font-size: 15px; color: var(--text-2); line-height: 1.45; }

.compounds-title { margin-bottom: 8px; }
.count { color: var(--faint); font-weight: 500; }
.compound { display: flex; align-items: center; gap: 12px; min-height: 56px; padding: 6px 0; border-bottom: 1px solid var(--divider); color: var(--text); }
.compound-hz { min-width: 88px; font-size: 18px; font-weight: 500; }
.compound-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.compound-py { font-size: 13px; color: var(--accent-text); }
.compound-def { font-size: 14px; color: var(--text-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.more { margin-top: 8px; height: 44px; border: none; background: none; color: var(--accent-text); font-size: 15px; font-weight: 600; cursor: pointer; }
.credit { font-size: 12px; color: var(--faint); }
</style>
