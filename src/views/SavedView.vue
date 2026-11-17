<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '../components/AppIcon.vue'
import { saved, toggleSaved } from '../lib/storage.js'
import { useSwipeRows } from '../lib/swipe.js'

const router = useRouter()
const filter = ref('')
const editing = ref(false)

const fold = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd')
const items = computed(() => {
  const f = fold(filter.value.trim())
  if (!f) return saved.value
  return saved.value.filter((w) => w.s.includes(filter.value.trim()) || fold(w.py).replace(/\s/g, '').includes(f.replace(/\s/g, '')) || fold(w.def).includes(f))
})

const { openKey, offset, rowStyle, onDown, onMove, onUp, swallowClick } = useSwipeRows(() => editing.value)

function onClick(w) {
  if (swallowClick()) return
  if (!editing.value) router.push({ name: 'word', params: { w: w.s } })
}

function remove(w) {
  openKey.value = null
  toggleSaved(w)
}
</script>

<template>
  <div class="screen with-tabbar saved">
    <div class="nav">
      <button v-if="saved.length" class="link-btn" @click="editing = !editing; openKey = null">{{ editing ? 'Xong' : 'Sửa' }}</button>
    </div>
    <div class="title-row">
      <h1 class="large-title">Đã lưu</h1>
      <span class="count">{{ saved.length }} từ</span>
    </div>

    <label v-if="saved.length" class="search-field quiet filter">
      <AppIcon name="search" :size="17" :stroke-width="2.2" />
      <input v-model="filter" type="search" placeholder="Tìm trong từ đã lưu" aria-label="Tìm trong từ đã lưu" autocomplete="off" spellcheck="false" />
    </label>

    <p v-if="!saved.length" class="state">Chưa lưu từ nào. Bấm biểu tượng dấu trang ở màn chi tiết để lưu.</p>
    <p v-else-if="!items.length" class="state">Không có từ nào khớp “{{ filter.trim() }}”.</p>
    <template v-else>
      <div class="group list">
        <div v-for="w in items" :key="w.s" class="swipe">
          <button v-if="offset(w.s) < 0" class="swipe-action" tabindex="-1" @click="remove(w)">Bỏ lưu</button>
          <div
            class="row-link" role="link" tabindex="0"
            :style="rowStyle(w.s)"
            @pointerdown="onDown($event, w.s)" @pointermove="onMove" @pointerup="onUp" @pointercancel="onUp"
            @click="onClick(w)" @keydown.enter="onClick(w)"
          >
            <button v-if="editing" class="minus" :aria-label="`Bỏ lưu ${w.s}`" @click.stop="remove(w)">
              <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="var(--danger)" /><path d="M7 12h10" stroke="#fff" stroke-width="2.4" stroke-linecap="round" /></svg>
            </button>
            <span class="row-hz">{{ w.s }}</span>
            <span class="row-body">
              <span class="row-py">{{ w.py }}</span>
              <span v-if="w.def" class="row-def">{{ w.def }}</span>
            </span>
            <AppIcon v-if="!editing" name="bookmark-filled" :size="18" style="color: var(--accent)" />
          </div>
        </div>
      </div>
      <p class="group-footer">Vuốt sang trái để bỏ lưu. Từ lưu gần nhất ở trên cùng.</p>
    </template>
  </div>
</template>

<style scoped>
.saved { padding-left: 16px; padding-right: 16px; }
.nav { display: flex; justify-content: flex-end; min-height: 44px; align-items: center; padding-top: 8px; }
.title-row { display: flex; align-items: baseline; gap: 10px; padding: 0 4px; }
.count { font-size: 15px; color: var(--muted); }
.filter { flex: none; margin-top: 12px; height: 40px; }
.list { margin-top: 20px; }
</style>
