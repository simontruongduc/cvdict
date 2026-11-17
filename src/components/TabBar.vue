<script setup>
// Floating bottom tab bar: icon-only, one tab per top-level section (route meta.tab).
// Styled after iOS 26 "Liquid Glass": a translucent, saturated blur with specular edges and a
// glass lens that slides under the active tab. (True refraction needs SVG backdrop filters,
// which WebKit does not support, so it is approximated with highlights and shadows.)
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppIcon from './AppIcon.vue'

const route = useRoute()
const TABS = [
  { key: 'search', to: { name: 'home' }, icon: 'search', label: 'Tra cứu' },
  { key: 'translate', to: { name: 'translate' }, icon: 'translate', label: 'Dịch' },
  { key: 'saved', to: { name: 'saved' }, icon: 'bookmark', label: 'Đã lưu' },
  { key: 'settings', to: { name: 'settings' }, icon: 'settings', label: 'Cài đặt' },
]
const active = computed(() => TABS.findIndex((t) => t.key === route.meta.tab))
</script>

<template>
  <nav class="tabbar" aria-label="Điều hướng chính">
    <span v-if="active >= 0" class="lens" :style="{ '--i': active }" aria-hidden="true" />
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
  --tab-w: 68px; --gap: 4px; --pad: 6px;
  position: fixed; left: 50%; bottom: max(12px, calc(var(--sab) - 10px)); transform: translateX(-50%); z-index: 30;
  display: flex; gap: var(--gap); padding: var(--pad); border-radius: 999px; isolation: isolate;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.34), rgba(255, 255, 255, 0.14));
  backdrop-filter: blur(5px) saturate(180%) brightness(1.08); -webkit-backdrop-filter: blur(5px) saturate(180%) brightness(1.08);
  border: 0.5px solid rgba(255, 255, 255, 0.7);
  box-shadow:
    inset 0 1px 1px rgba(255, 255, 255, 0.95),   /* top specular edge */
    inset 0 -1px 1px rgba(255, 255, 255, 0.45),  /* bottom rim light */
    inset 0 0 14px rgba(255, 255, 255, 0.35),    /* inner glow */
    0 10px 30px rgba(0, 0, 0, 0.14), 0 1px 4px rgba(0, 0, 0, 0.08);
}
/* Soft sheen across the upper half of the glass. */
.tabbar::before {
  content: ''; position: absolute; inset: 1px; border-radius: inherit; pointer-events: none; z-index: -1;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.55) 0%, rgba(255, 255, 255, 0) 55%);
  opacity: 0.6;
}
.lens {
  position: absolute; top: var(--pad); left: var(--pad); width: var(--tab-w); height: 48px; border-radius: 999px; z-index: -1;
  transform: translateX(calc(var(--i) * (var(--tab-w) + var(--gap))));
  transition: transform 0.45s cubic-bezier(0.34, 1.4, 0.5, 1);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.7), rgba(255, 236, 236, 0.45));
  backdrop-filter: blur(3px); -webkit-backdrop-filter: blur(3px);
  box-shadow:
    inset 0 1px 1px rgba(255, 255, 255, 1), inset 0 -1px 2px rgba(194, 39, 45, 0.12),
    0 2px 8px rgba(194, 39, 45, 0.16), 0 0 0 0.5px rgba(194, 39, 45, 0.12);
}
.tab {
  width: var(--tab-w); height: 48px; border-radius: 999px; display: flex; align-items: center; justify-content: center;
  color: #3A3A3C; transition: color 0.2s, transform 0.2s;
}
.tab:active { transform: scale(0.92); }
.tab.on { color: var(--accent); }
@media (prefers-reduced-motion: reduce) { .lens, .tab { transition: none; } }
@media (prefers-reduced-transparency: reduce) {
  .tabbar { background: rgba(255, 255, 255, 0.96); backdrop-filter: none; -webkit-backdrop-filter: none; }
}
</style>
