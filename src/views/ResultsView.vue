<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '../components/AppIcon.vue'
import { dictReady, search } from '../lib/dict.js'
import { highlight } from '../lib/highlight.js'
import { pushHistory } from '../lib/storage.js'

const route = useRoute()
const router = useRouter()
const text = ref(route.query.q || '')
const result = ref(null)
const loading = ref(true)
const tab = computed(() => (route.query.tab === 'contains' ? 'contains' : 'match'))

async function load() {
  const q = String(route.query.q || '').trim()
  text.value = q
  if (!q) { result.value = null; loading.value = false; return }
  loading.value = true
  await dictReady
  result.value = await search(q, 'full')
  loading.value = false
}
watch(() => route.query.q, load, { immediate: true })

const isVi = computed(() => result.value && result.value.kind !== 'hanzi' && result.value.kind !== 'pinyin')
const hasContains = computed(() => result.value && result.value.containsTotal > 0)
const tabs = computed(() => [
  { key: 'match', label: isVi.value ? 'Khớp nghĩa' : 'Khớp', count: result.value?.matchTotal || 0 },
  { key: 'contains', label: isVi.value ? `Cụm từ chứa “${text.value}”` : `Chứa “${text.value}”`, count: result.value?.containsTotal || 0 },
])
const list = computed(() => (result.value ? result.value[tab.value] : []))
const total = computed(() => (tab.value === 'match' ? result.value?.matchTotal : result.value?.containsTotal) || 0)

function setTab(key) {
  router.replace({ query: { ...route.query, tab: key === 'match' ? undefined : key } })
}

function submit() {
  const q = text.value.trim()
  if (!q) return
  pushHistory({ type: 'query', q })
  router.replace({ query: { q } })
}

function open(item) {
  pushHistory({ type: 'word', s: item.s, py: item.py })
  router.push({ name: 'word', params: { w: item.s } })
}

const parts = (def) => (isVi.value ? highlight(def, text.value) : [{ text: def, hit: false }])
</script>

<template>
  <div class="screen with-tabbar">
    <div class="topbar">
      <div class="topbar-row">
        <button class="round-btn" aria-label="Quay lại" @click="router.back()"><AppIcon name="back" :stroke-width="2.2" /></button>
        <form class="search-field quiet" role="search" @submit.prevent="submit">
          <AppIcon name="search" :size="18" :stroke-width="2.2" />
          <input v-model="text" type="search" enterkeyhint="search" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Tìm kiếm" />
        </form>
      </div>
      <div v-if="hasContains" class="segmented" role="tablist" aria-label="Loại kết quả">
        <button
          v-for="t in tabs" :key="t.key" role="tab" :aria-selected="tab === t.key"
          :class="{ on: tab === t.key }" @click="setTab(t.key)"
        >{{ t.label }} <span class="count">{{ t.count }}</span></button>
      </div>
    </div>

    <p v-if="loading" class="state">Đang tìm…</p>
    <p v-else-if="!result || (!result.matchTotal && !result.containsTotal)" class="state">
      Không tìm thấy kết quả cho “{{ route.query.q }}”.
    </p>
    <template v-else>
      <div class="summary">
        Kết quả cho “<strong>{{ route.query.q }}</strong>” · {{ total.toLocaleString('vi-VN') }} mục
        <template v-if="total > list.length"> (hiện {{ list.length }})</template>
      </div>
      <div class="cards">
        <a v-for="it in list" :key="it.id" href="#" class="card" @click.prevent="open(it)">
          <div class="card-head">
            <span class="hz card-hz">{{ it.s }}</span>
            <span class="card-py">{{ it.py }}</span>
          </div>
          <div class="card-def">
            <template v-for="(p, i) in parts(it.def)" :key="i"><mark v-if="p.hit" class="hit">{{ p.text }}</mark><template v-else>{{ p.text }}</template></template>
          </div>
          <AppIcon name="chevron" :size="14" :stroke-width="2.6" class="card-chev" />
        </a>
      </div>
    </template>
  </div>
</template>

<style scoped>
.summary { padding: 4px 20px 8px; font-size: 13px; color: var(--muted); }
.summary strong { color: var(--text); }
.cards { padding: 0 16px; display: flex; flex-direction: column; gap: 10px; }
.card { display: flex; align-items: center; gap: 14px; padding: 14px 14px 14px 16px; background: var(--surface); border-radius: 16px; color: var(--text); }
.card:hover { background: #FAFAFC; }
.card-head { display: flex; flex-direction: column; gap: 2px; min-width: 72px; max-width: 45%; }
.card-hz { font-size: 24px; font-weight: 500; line-height: 1.2; word-break: break-all; }
.card-py { font-size: 13px; color: var(--accent-text); font-weight: 500; }
.card-def { flex: 1; min-width: 0; font-size: 15px; line-height: 1.45; color: var(--text-2); }
.card-chev { color: var(--chevron); flex-shrink: 0; }
</style>
