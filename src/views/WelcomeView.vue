<script setup>
import { useRouter } from 'vue-router'
import AppIcon from '../components/AppIcon.vue'
import { setSetting } from '../lib/settings.js'

const router = useRouter()

const FEATURES = [
  { icon: 'search', title: 'Tra Trung ⇄ Việt', text: 'Gõ chữ Hán, pinyin hoặc tiếng Việt. Gợi ý hiện ngay khi bạn gõ.' },
  { icon: 'pen', title: 'Học cách viết', text: 'Xem thứ tự nét từng chữ, luyện viết hoặc viết tay để tra.' },
  { icon: 'bookmark', title: 'Lưu từ vựng', text: 'Đánh dấu từ quan trọng, ôn lại bất cứ lúc nào trong tab Đã lưu.' },
]

function done() {
  setSetting('welcomed', '1').catch(() => {})
  router.replace({ name: 'home' })
}
</script>

<template>
  <div class="screen welcome">
    <div class="head">
      <div class="logo hz" aria-hidden="true">辞</div>
      <h1>Chào mừng đến<br>với CVDict</h1>
    </div>

    <ul class="features">
      <li v-for="f in FEATURES" :key="f.title">
        <span class="f-icon"><AppIcon :name="f.icon" :size="34" /></span>
        <span class="f-body">
          <span class="f-title">{{ f.title }}</span>
          <span class="f-text">{{ f.text }}</span>
        </span>
      </li>
    </ul>

    <div class="spacer" />
    <button class="continue" @click="done">Tiếp tục</button>
  </div>
</template>

<style scoped>
.welcome { background: #fff; padding: 72px 32px 40px; }
.head { display: flex; flex-direction: column; align-items: center; gap: 20px; }
.logo {
  width: 88px; height: 88px; border-radius: 22px; background: var(--accent); color: #fff; font-size: 48px; font-weight: 700;
  display: flex; align-items: center; justify-content: center; box-shadow: 0 10px 24px rgba(194, 39, 45, 0.28);
}
h1 { margin: 0; font-size: 34px; line-height: 1.15; font-weight: 800; letter-spacing: -0.02em; text-align: center; }
.features { list-style: none; margin: 48px 0 0; padding: 0 4px; display: flex; flex-direction: column; gap: 30px; }
.features li { display: flex; gap: 18px; align-items: flex-start; }
.f-icon { width: 44px; flex-shrink: 0; display: flex; justify-content: center; color: var(--accent); }
.f-body { display: flex; flex-direction: column; gap: 3px; }
.f-title { font-size: 16px; font-weight: 600; }
.f-text { font-size: 15px; line-height: 1.4; color: var(--muted); }
.spacer { flex: 1; min-height: 32px; }
.continue {
  width: 100%; height: 54px; border: none; border-radius: 16px; background: var(--accent); color: #fff;
  font-size: 17px; font-weight: 600; cursor: pointer;
}
</style>
