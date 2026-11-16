<script setup>
// Floating bottom tab bar: icon-only, one tab per top-level section (route meta.tab).
import { useRoute } from 'vue-router'
import AppIcon from './AppIcon.vue'

const route = useRoute()
const TABS = [
  { key: 'search', to: { name: 'home' }, icon: 'search', label: 'Tra cứu' },
  { key: 'saved', to: { name: 'saved' }, icon: 'bookmark', label: 'Đã lưu' },
  { key: 'settings', to: { name: 'settings' }, icon: 'settings', label: 'Cài đặt' },
]
</script>

<template>
  <nav class="tabbar" aria-label="Điều hướng chính">
    <RouterLink
      v-for="t in TABS" :key="t.key" :to="t.to" :aria-label="t.label"
      :aria-current="route.meta.tab === t.key ? 'page' : undefined"
      :class="['tab', { on: route.meta.tab === t.key }]"
    >
      <AppIcon
        :name="t.icon === 'bookmark' && route.meta.tab === t.key ? 'bookmark-filled' : t.icon"
        :size="24" :stroke-width="route.meta.tab === t.key ? 2.1 : 1.9"
      />
    </RouterLink>
  </nav>
</template>

<style scoped>
.tabbar {
  position: fixed; left: 50%; bottom: max(12px, calc(var(--sab) - 10px)); transform: translateX(-50%); z-index: 30;
  display: flex; gap: 4px; padding: 6px; border-radius: 999px;
  background: rgba(255, 255, 255, 0.86); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(0, 0, 0, 0.06); box-shadow: 0 8px 28px rgba(0, 0, 0, 0.12), 0 1px 3px rgba(0, 0, 0, 0.06);
}
.tab {
  width: 68px; height: 48px; border-radius: 999px; display: flex; align-items: center; justify-content: center;
  color: #48484A; transition: background-color 0.15s;
}
.tab.on { background: var(--accent-soft); color: var(--accent); }
</style>
