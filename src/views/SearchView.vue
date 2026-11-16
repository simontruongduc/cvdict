<script setup>
import { onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '../components/AppIcon.vue'
import { dictReady, search } from '../lib/dict.js'
import { pushHistory } from '../lib/storage.js'

const route = useRoute()
const router = useRouter()
const input = ref(null)
const q = ref(route.query.q || '')
const items = ref([])
const total = ref(0)
const loading = ref(true)
const error = ref('')

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

onMounted(() => input.value?.focus())

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
  input.value?.focus()
}
</script>

<template>
  <div class="screen">
    <div class="topbar">
      <div class="topbar-row">
        <RouterLink :to="{ name: 'home' }" class="icon-btn" aria-label="Quay lại"><AppIcon name="back" /></RouterLink>
        <form class="search-field" role="search" @submit.prevent="submit">
          <AppIcon name="search" :size="18" style="color: var(--faint)" />
          <input
            ref="input" v-model="q" type="search" enterkeyhint="search" autocomplete="off" autocapitalize="off"
            spellcheck="false" aria-label="Tìm kiếm" placeholder="学习, xuexi, học…"
          />
          <button v-if="q" type="button" class="clear-btn" aria-label="Xóa nội dung" @click="clear">
            <AppIcon name="close" :size="14" />
          </button>
        </form>
      </div>
    </div>

    <div class="list">
      <p v-if="error" class="state">Không tải được từ điển: {{ error }}</p>
      <p v-else-if="loading" class="state">Đang tải từ điển…</p>
      <p v-else-if="q.trim() && !items.length" class="state">Không tìm thấy kết quả cho “{{ q.trim() }}”.</p>
      <template v-else>
        <a v-for="it in items" :key="it.id" href="#" class="row-link" @click.prevent="open(it)">
          <div class="row-hz">{{ it.s }}</div>
          <div class="row-body">
            <div class="row-py">{{ it.py }}</div>
            <div class="row-def">{{ it.def }}</div>
          </div>
          <AppIcon name="chevron" :size="16" style="color: var(--chevron)" />
        </a>
        <button v-if="items.length" class="see-all" @click="submit">
          Xem tất cả kết quả cho “{{ q.trim() }}”
          <AppIcon name="arrow" :size="16" />
        </button>
      </template>
    </div>
  </div>
</template>

<style scoped>
.list { flex: 1; background: var(--surface); }
.see-all {
  width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; height: 56px;
  border: none; background: none; font-size: 15px; font-weight: 600; color: var(--accent-text); cursor: pointer;
}
input[type='search']::-webkit-search-cancel-button { display: none; }
</style>
