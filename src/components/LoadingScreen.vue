<script setup>
defineProps({ error: { type: String, default: '' } })
const logoUrl = `${import.meta.env.BASE_URL}logo.png`
</script>

<template>
  <div class="loading">
    <div class="center">
      <img class="logo" :src="logoUrl" alt="" />
      <div class="name hz">词包</div>
      <div class="tagline">Từ điển Trung ⇄ Việt</div>
    </div>
    <div class="status" role="status">
      <template v-if="error">Không tải được từ điển: {{ error }}</template>
      <template v-else>
        <svg class="spinner" width="28" height="28" viewBox="0 0 24 24" aria-hidden="true">
          <g stroke="#8E8E93" stroke-width="2.2" stroke-linecap="round">
            <line x1="12" y1="2.5" x2="12" y2="6.5" />
            <line x1="18.7" y1="5.3" x2="15.9" y2="8.1" opacity="0.88" />
            <line x1="21.5" y1="12" x2="17.5" y2="12" opacity="0.76" />
            <line x1="18.7" y1="18.7" x2="15.9" y2="15.9" opacity="0.64" />
            <line x1="12" y1="21.5" x2="12" y2="17.5" opacity="0.52" />
            <line x1="5.3" y1="18.7" x2="8.1" y2="15.9" opacity="0.4" />
            <line x1="2.5" y1="12" x2="6.5" y2="12" opacity="0.3" />
            <line x1="5.3" y1="5.3" x2="8.1" y2="8.1" opacity="0.2" />
          </g>
        </svg>
        <span>Đang tải từ điển…</span>
      </template>
    </div>
  </div>
</template>

<style scoped>
.loading {
  position: fixed; inset: 0; z-index: 100; background: #fff; display: flex; flex-direction: column; align-items: center;
  padding: var(--sat) 32px calc(var(--sab) + 64px);
}
.center { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 18px; }
.logo { width: 112px; height: 112px; border-radius: 25px; box-shadow: 0 14px 32px rgba(240, 186, 54, 0.35); }
.name { font-size: 28px; font-weight: 700; letter-spacing: -0.02em; }
.tagline { font-size: 15px; color: var(--muted); }
.status { display: flex; flex-direction: column; align-items: center; gap: 12px; font-size: 13px; color: var(--muted); text-align: center; }
.spinner { animation: spin 0.9s steps(8) infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .spinner { animation: none; } }
</style>
