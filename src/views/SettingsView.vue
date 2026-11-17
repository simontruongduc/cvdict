<script setup>
import { ref, watch } from 'vue'
import AppIcon from '../components/AppIcon.vue'
import { geminiKey, saveGeminiKey, saveSearchTrad, searchTrad } from '../lib/settings.js'

const key = ref(geminiKey.value)
const show = ref(false)
const status = ref('') // '' | 'saved' | 'error'
const showLicenses = ref(false)

// The stored key may finish loading from SQLite after this screen opens.
watch(geminiKey, (v) => { if (!key.value) key.value = v })
watch(key, () => { status.value = '' })

function toggleTrad(e) {
  saveSearchTrad(e.target.checked).catch((err) => console.warn('Saving search setting failed', err))
}

async function save() {
  try {
    await saveGeminiKey(key.value)
    status.value = 'saved'
  } catch (e) {
    console.warn('Saving Gemini key failed', e)
    status.value = 'error'
  }
}
</script>

<template>
  <div class="screen with-tabbar settings">
    <h1 class="large-title">Cài đặt</h1>

    <h2 class="group-header">Tra cứu</h2>
    <div class="group switch-row">
      <label for="search-trad">Kết quả hiện chữ phồn thể</label>
      <input id="search-trad" :checked="searchTrad" type="checkbox" role="switch" class="switch" @change="toggleTrad" />
    </div>
    <p class="group-footer">Khi bật, tra bằng tiếng Việt hoặc pinyin sẽ hiện kết quả bằng chữ phồn thể. Tra bằng chữ Hán vẫn hiện đúng kiểu chữ bạn nhập.</p>

    <form @submit.prevent="save">
      <h2 class="group-header">Gemini AI</h2>
      <div class="group field">
        <label for="gemini-key">Gemini key</label>
        <div class="field-row">
          <input
            id="gemini-key" v-model="key" :type="show ? 'text' : 'password'" placeholder="Dán API key vào đây"
            autocomplete="off" autocapitalize="off" spellcheck="false"
          />
          <button type="button" class="icon-btn" :aria-label="show ? 'Ẩn key' : 'Hiện key'" :aria-pressed="show" @click="show = !show">
            <AppIcon name="eye" :size="20" />
          </button>
        </div>
      </div>
      <p class="group-footer">Key chỉ được lưu trên thiết bị này. Dùng để tra thêm câu ví dụ, cách dùng và từ đồng/trái nghĩa ở màn chi tiết.</p>

      <button type="submit" class="save">
        <AppIcon v-if="status === 'saved'" name="check" :size="18" :stroke-width="2.4" />
        {{ status === 'saved' ? 'Đã lưu' : 'Lưu' }}
      </button>
      <p v-if="status === 'error'" class="error" role="alert">Không lưu được key. Hãy thử lại.</p>
    </form>

    <button class="licenses-toggle" :aria-expanded="showLicenses" @click="showLicenses = !showLicenses">Giấy phép &amp; nguồn dữ liệu</button>
    <ul v-if="showLicenses" class="licenses">
      <li>Từ điển: CVDICT, giấy phép CC BY-SA 4.0.</li>
      <li>Thứ tự nét: Make Me a Hanzi qua hanzi-writer-data, giấy phép Arphic Public License.</li>
      <li>Nhận dạng chữ viết tay: hanzi_lookup (Gábor L. Ugray), giấy phép LGPL-3.0; dữ liệu nét theo Arphic Public License.</li>
    </ul>
  </div>
</template>

<style scoped>
.settings { padding: 32px 16px 0; }
.settings .large-title { padding: 0 4px; }
.field { padding: 12px 4px 4px 16px; display: flex; flex-direction: column; gap: 2px; }
.field label { font-size: 13px; font-weight: 600; color: var(--text-2); }
.field-row { display: flex; align-items: center; gap: 4px; }
.field-row input {
  flex: 1; min-width: 0; height: 40px; border: none; outline: none; background: transparent;
  font: 17px ui-monospace, 'SF Mono', Menlo, monospace; color: var(--text);
}
.field-row input::placeholder { font-family: var(--font); color: var(--muted); }
.field-row .icon-btn { color: var(--muted); }
.save {
  width: 100%; margin-top: 24px; height: 52px; border: none; border-radius: 14px; background: var(--accent); color: #fff;
  font-size: 17px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;
}
.error { margin: 10px 0 0; text-align: center; font-size: 14px; color: var(--danger); }
.licenses-toggle {
  margin-top: 40px; align-self: center; border: none; background: none; font-size: 13px; color: var(--muted);
  text-decoration: underline; cursor: pointer; padding: 8px;
}
.licenses { margin: 4px 0 0; padding: 0 16px 0 32px; font-size: 13px; line-height: 1.5; color: var(--muted); }
</style>
