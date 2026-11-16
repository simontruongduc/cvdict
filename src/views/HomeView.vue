<script setup>
import { ref } from 'vue'
import AppIcon from '../components/AppIcon.vue'
import { dictReady } from '../lib/dict.js'
import { history, clearHistory } from '../lib/storage.js'

const entries = ref(null)
dictReady.then((r) => { entries.value = r.entries }).catch(() => {})

const recent = () => history.value.slice(0, 12)
const target = (h) => (h.type === 'word' ? { name: 'word', params: { w: h.s } } : { name: 'results', query: { q: h.q } })
</script>

<template>
  <div class="screen home">
    <header class="home-header">
      <div class="brand">
        <div class="logo hz">辞</div>
        <div class="brand-name">CVDict</div>
      </div>
      <RouterLink class="icon-btn" :to="{ name: 'history' }" aria-label="Lịch sử tra cứu và từ đã lưu">
        <AppIcon name="history" />
      </RouterLink>
    </header>

    <div class="intro">
      <h1>Tra từ Trung ⇄ Việt</h1>
    </div>

    <div class="search-wrap">
      <RouterLink :to="{ name: 'search' }" class="fake-search" aria-label="Ô tìm kiếm">
        <AppIcon name="search" :size="20" />
        <span>学习, xuexi, học…</span>
      </RouterLink>
    </div>

    <section v-if="history.length" class="recent">
      <div class="recent-head">
        <h2 class="section-title">Tra gần đây</h2>
        <button class="link-btn" @click="clearHistory">Xóa</button>
      </div>
      <div class="chips">
        <RouterLink v-for="h in recent()" :key="h.type + (h.s || h.q)" :to="target(h)" class="chip">
          <template v-if="h.type === 'word'">
            <span class="hz chip-hz">{{ h.s }}</span>
            <span class="chip-py">{{ h.py }}</span>
          </template>
          <template v-else>{{ h.q }}</template>
        </RouterLink>
      </div>
    </section>

    <div class="spacer" />
    <footer class="foot">
      <template v-if="entries">{{ entries.toLocaleString('vi-VN') }} mục từ · </template>Dữ liệu CVDICT (CC BY-SA 4.0)
    </footer>
  </div>
</template>

<style scoped>
.home-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 20px 8px; }
.brand { display: flex; align-items: center; gap: 10px; }
.logo {
  width: 36px; height: 36px; border-radius: 10px; background: var(--accent); color: #fff;
  display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 700;
}
.brand-name { font-size: 20px; font-weight: 700; letter-spacing: -0.01em; }
.home-header .icon-btn { color: var(--text-2); }
.intro { padding: 28px 20px 0; }
h1 { margin: 0; font-size: 26px; line-height: 1.25; font-weight: 700; letter-spacing: -0.02em; }
.search-wrap { padding: 20px 20px 0; }
.fake-search {
  display: flex; align-items: center; gap: 10px; height: 56px; padding: 0 16px; background: var(--surface);
  border: 1.5px solid var(--border-2); border-radius: 14px; color: var(--faint); font-size: 16px;
  box-shadow: 0 2px 8px rgba(23, 23, 26, 0.05);
}
.fake-search:hover { border-color: var(--accent); }
.recent { padding: 28px 20px 0; }
.recent-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.link-btn { border: none; background: none; color: var(--accent-text); font-size: 14px; font-weight: 500; cursor: pointer; padding: 8px 0 8px 12px; }
.chips { display: flex; flex-wrap: wrap; gap: 8px; }
.chip {
  display: flex; align-items: center; gap: 6px; min-height: 40px; padding: 0 14px; background: var(--surface);
  border: 1px solid var(--border); border-radius: 20px; color: var(--text); font-size: 15px;
}
.chip:hover { border-color: var(--border-2); }
.chip-hz { font-weight: 500; }
.chip-py { color: var(--faint); font-size: 13px; }
.spacer { flex: 1; }
.foot { padding: 16px 20px 24px; text-align: center; font-size: 12px; color: var(--faint); }
</style>
