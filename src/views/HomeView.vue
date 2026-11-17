<script setup>
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '../components/AppIcon.vue'
import { clearHistory, history, removeHistory } from '../lib/storage.js'
import { useSwipeRows } from '../lib/swipe.js'

const router = useRouter()
const editing = ref(false)
const { openKey, offset, rowStyle, onDown, onMove, onUp, swallowClick } = useSwipeRows(() => editing.value)

const recent = () => history.value.slice(0, 12)
const keyOf = (h) => h.type + ':' + (h.s || h.q)
const target = (h) => (h.type === 'word' ? { name: 'word', params: { w: h.s } } : { name: 'results', query: { q: h.q } })

function open(h) {
  if (swallowClick() || editing.value) return
  router.push(target(h))
}

function remove(h) {
  openKey.value = null
  removeHistory(h)
}

function toggleEdit() {
  editing.value = !editing.value
  openKey.value = null
}

watch(() => history.value.length, (n) => { if (!n) editing.value = false })
</script>

<template>
  <div class="screen with-tabbar home">
    <header class="home-header">
      <h1 class="large-title">Tra cứu</h1>
      <div class="logo hz" aria-hidden="true">辞</div>
    </header>

    <div class="search-field quiet home-search">
      <RouterLink :to="{ name: 'search' }" class="fake-input" aria-label="Ô tìm kiếm">
        <AppIcon name="search" :size="18" :stroke-width="2.2" />
        <span>学习, xuexi, học…</span>
      </RouterLink>
      <RouterLink :to="{ name: 'search', query: { hw: 1 } }" class="field-btn" aria-label="Viết tay">
        <AppIcon name="pen" :size="20" :stroke-width="2" />
      </RouterLink>
    </div>

    <section v-if="history.length" class="recent">
      <div class="recent-head">
        <h2 class="section-title">Tra gần đây</h2>
        <span class="head-actions">
          <button v-if="editing" class="link-btn small danger" @click="clearHistory">Xóa tất cả</button>
          <button class="link-btn small" :class="{ strong: editing }" @click="toggleEdit">{{ editing ? 'Xong' : 'Sửa' }}</button>
        </span>
      </div>
      <div class="group">
        <div v-for="h in recent()" :key="keyOf(h)" class="swipe">
          <button v-if="offset(keyOf(h)) < 0" class="swipe-action" tabindex="-1" @click="remove(h)">Xóa</button>
          <div
            class="row-link" role="link" tabindex="0" :style="rowStyle(keyOf(h))"
            @pointerdown="onDown($event, keyOf(h))" @pointermove="onMove" @pointerup="onUp" @pointercancel="onUp"
            @click="open(h)" @keydown.enter="open(h)"
          >
            <button v-if="editing" class="minus" :aria-label="`Xóa ${h.s || h.q} khỏi lịch sử`" @click.stop="remove(h)">
              <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="var(--danger)" /><path d="M7 12h10" stroke="#fff" stroke-width="2.4" stroke-linecap="round" /></svg>
            </button>
            <template v-if="h.type === 'word'">
              <span class="row-hz">{{ h.s }}</span>
              <span class="row-body">
                <span class="row-py">{{ h.py }}</span>
                <span v-if="h.def" class="row-def">{{ h.def }}</span>
              </span>
            </template>
            <template v-else>
              <AppIcon name="search" :size="18" style="color: var(--muted)" />
              <span class="row-body"><span class="row-def">{{ h.q }}</span></span>
            </template>
            <AppIcon v-if="!editing" name="chevron" :size="14" :stroke-width="2.6" style="color: var(--chevron)" />
          </div>
        </div>
      </div>
      <p class="group-footer">Vuốt sang trái để xóa từng dòng.</p>
    </section>
  </div>
</template>

<style scoped>
.home { padding-left: 16px; padding-right: 16px; }
.home-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 4px 0; }
.logo {
  width: 36px; height: 36px; border-radius: 10px; background: var(--accent); color: #fff;
  display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 700;
}
.home-search { flex: none; margin-top: 14px; }
.fake-input { flex: 1; height: 44px; display: flex; align-items: center; gap: 8px; color: var(--placeholder); font-size: 17px; }
.recent { margin-top: 28px; }
.recent-head { display: flex; align-items: baseline; justify-content: space-between; padding: 0 16px; margin-bottom: 4px; }
.head-actions { display: flex; gap: 14px; }
.link-btn.small { font-size: 15px; }
.link-btn.danger { color: var(--danger); }
.link-btn.strong { font-weight: 600; }
</style>
