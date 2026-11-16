<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '../components/AppIcon.vue'
import { clearHistory, history, saved, toggleSaved } from '../lib/storage.js'

const router = useRouter()
const tab = ref(saved.value.length ? 'saved' : 'history')
const items = computed(() => (tab.value === 'saved' ? saved.value : history.value))

const target = (h) => (h.type === 'query' ? { name: 'results', query: { q: h.q } } : { name: 'word', params: { w: h.s } })
</script>

<template>
  <div class="screen">
    <div class="topbar">
      <div class="topbar-row">
        <button class="icon-btn" aria-label="Quay lại" @click="router.back()"><AppIcon name="back" /></button>
        <h1 class="title">Lịch sử &amp; đã lưu</h1>
        <button v-if="tab === 'history' && history.length" class="link-btn" @click="clearHistory">Xóa hết</button>
      </div>
      <div class="tabs" role="tablist">
        <button role="tab" :aria-selected="tab === 'saved'" :class="['tab', { on: tab === 'saved' }]" @click="tab = 'saved'">Đã lưu <span class="count">{{ saved.length }}</span></button>
        <button role="tab" :aria-selected="tab === 'history'" :class="['tab', { on: tab === 'history' }]" @click="tab = 'history'">Lịch sử <span class="count">{{ history.length }}</span></button>
      </div>
    </div>

    <div class="list">
      <p v-if="!items.length" class="state">
        {{ tab === 'saved' ? 'Chưa lưu từ nào. Bấm biểu tượng dấu trang ở màn chi tiết để lưu.' : 'Chưa có lịch sử tra cứu.' }}
      </p>
      <div v-for="h in items" :key="(h.type || 'word') + (h.s || h.q)" class="item">
        <RouterLink :to="target(h)" class="row-link">
          <template v-if="h.type === 'query'">
            <AppIcon name="search" :size="18" style="color: var(--faint)" />
            <div class="row-body"><div class="row-def">{{ h.q }}</div></div>
          </template>
          <template v-else>
            <div class="row-hz">{{ h.s }}</div>
            <div class="row-body">
              <div class="row-py">{{ h.py }}</div>
              <div v-if="h.def" class="row-def">{{ h.def }}</div>
            </div>
          </template>
          <AppIcon name="chevron" :size="16" style="color: var(--chevron)" />
        </RouterLink>
        <button v-if="tab === 'saved'" class="icon-btn unsave" aria-label="Bỏ lưu" @click="toggleSaved(h)">
          <AppIcon name="bookmark-filled" :size="20" />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.topbar { padding-bottom: 0; }
.title { flex: 1; margin: 0; font-size: 18px; font-weight: 700; }
.link-btn { border: none; background: none; color: var(--accent-text); font-size: 14px; font-weight: 500; cursor: pointer; padding: 8px; }
.tabs { display: flex; gap: 20px; padding: 0 4px; }
.tab {
  height: 40px; padding: 0; border: none; border-bottom: 2.5px solid transparent; background: transparent;
  font-size: 14px; font-weight: 500; color: var(--muted); cursor: pointer;
}
.tab.on { border-bottom-color: var(--accent); font-weight: 600; color: var(--text); }
.count { font-size: 12px; color: var(--faint); }
.list { flex: 1; background: var(--surface); }
.item { position: relative; }
.item .row-link { padding-right: 64px; }
.unsave { position: absolute; right: 8px; top: 50%; transform: translateY(-50%); color: var(--accent); }
</style>
