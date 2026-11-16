<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '../components/AppIcon.vue'
import HandwritingPad from '../components/HandwritingPad.vue'
import { dictReady, search } from '../lib/dict.js'
import { pushHistory } from '../lib/storage.js'
import { sheetOpen } from '../lib/ui.js'

const route = useRoute()
const router = useRouter()
const input = ref(null)
const q = ref(route.query.q || '')
const items = ref([])
const total = ref(0)
const loading = ref(true)
const error = ref('')
const padOpen = ref(!!route.query.hw)

dictReady.then(() => { loading.value = false; run() }).catch((e) => { error.value = e.message })

let timer, seq = 0
async function run() {
  const text = q.value.trim()
  router.replace({ query: text ? { q: q.value } : {} })
  if (!text) { items.value = []; total.value = 0; return }
  const mine = ++seq
  const r = await search(text, 'suggest')
  if (mine !== seq) return
  items.value = r.match
  total.value = r.total
}

watch(q, () => {
  clearTimeout(timer)
  if (!loading.value) timer = setTimeout(run, 120)
})

watch(padOpen, (v) => { sheetOpen.value = v }, { immediate: true })
onBeforeUnmount(() => { sheetOpen.value = false })

onMounted(() => { if (!padOpen.value) input.value?.focus() })

function open(item) {
  pushHistory({ type: 'word', s: item.s, py: item.py })
  router.push({ name: 'word', params: { w: item.s } })
}

function submit() {
  const text = q.value.trim()
  if (!text) return
  pushHistory({ type: 'query', q: text })
  router.push({ name: 'results', query: { q: text } })
}

function clear() {
  q.value = ''
  if (!padOpen.value) input.value?.focus()
}

function togglePad() {
  padOpen.value = !padOpen.value
  if (padOpen.value) input.value?.blur()
  else input.value?.focus()
}
</script>

<template>
  <div :class="['screen', padOpen ? 'pad-space' : 'with-tabbar']">
    <div class="topbar">
      <form class="topbar-row" role="search" @submit.prevent="submit">
        <label class="search-field">
          <AppIcon name="search" :size="18" :stroke-width="2.2" />
          <input
            ref="input" v-model="q" type="search" enterkeyhint="search" autocomplete="off" autocapitalize="off"
            spellcheck="false" aria-label="Tìm kiếm" placeholder="学习, xuexi, học…" @focus="padOpen = false"
          />
          <button v-if="q" type="button" class="clear-btn" aria-label="Xóa nội dung" @click="clear">
            <AppIcon name="close" :size="12" :stroke-width="3.2" />
          </button>
          <button type="button" :class="['field-btn', { on: padOpen }]" aria-label="Viết tay" :aria-pressed="padOpen" @click="togglePad">
            <AppIcon name="pen" :size="20" :stroke-width="2" />
          </button>
        </label>
        <RouterLink :to="{ name: 'home' }" class="link-btn">Hủy</RouterLink>
      </form>
    </div>

    <div class="list">
      <p v-if="error" class="state">Không tải được từ điển: {{ error }}</p>
      <p v-else-if="loading" class="state">Đang tải từ điển…</p>
      <p v-else-if="q.trim() && !items.length" class="state">Không tìm thấy kết quả cho “{{ q.trim() }}”.</p>
      <template v-else-if="items.length">
        <h2 class="group-header">Gợi ý</h2>
        <div class="group">
          <a v-for="it in items" :key="it.id" href="#" class="row-link" @click.prevent="open(it)">
            <span class="row-hz">{{ it.s }}</span>
            <span class="row-body">
              <span class="row-py">{{ it.py }}</span>
              <span class="row-def">{{ it.def }}</span>
            </span>
          </a>
          <button class="see-all" @click="submit">
            <span>Xem tất cả kết quả cho “{{ q.trim() }}”</span>
            <AppIcon name="arrow" :size="16" :stroke-width="2.2" />
          </button>
        </div>
      </template>
    </div>

    <HandwritingPad v-if="padOpen" v-model="q" @close="padOpen = false" />
  </div>
</template>

<style scoped>
.pad-space { padding-bottom: 460px; }
.topbar .link-btn { padding: 8px 0; }
.list { padding: 0 16px; }
.list .group-header { margin-top: 8px; }
.see-all {
  width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 8px; height: 52px; padding: 0 16px;
  border: none; background: none; font-size: 16px; font-weight: 600; color: var(--accent-text); cursor: pointer;
}
</style>
