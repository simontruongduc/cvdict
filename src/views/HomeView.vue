<script setup>
import AppIcon from '../components/AppIcon.vue'
import { history, clearHistory } from '../lib/storage.js'

const recent = () => history.value.slice(0, 12)
const target = (h) => (h.type === 'word' ? { name: 'word', params: { w: h.s } } : { name: 'results', query: { q: h.q } })
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
        <button class="link-btn small" @click="clearHistory">Xóa</button>
      </div>
      <div class="group">
        <RouterLink v-for="h in recent()" :key="h.type + (h.s || h.q)" :to="target(h)" class="row-link">
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
          <AppIcon name="chevron" :size="14" :stroke-width="2.6" style="color: var(--chevron)" />
        </RouterLink>
      </div>
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
.link-btn.small { font-size: 15px; }
</style>
