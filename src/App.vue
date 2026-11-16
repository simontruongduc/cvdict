<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import LoadingScreen from './components/LoadingScreen.vue'
import TabBar from './components/TabBar.vue'
import { dictReady } from './lib/dict.js'
import { getSetting } from './lib/settings.js'
import { savedReady } from './lib/storage.js'
import { sheetOpen } from './lib/ui.js'

const route = useRoute()
const router = useRouter()
const booting = ref(true)
const error = ref('')

// Show the loading screen until the dictionary and local DB are ready, then the
// welcome screen on first launch.
Promise.all([dictReady, savedReady])
  .then(async () => {
    const welcomed = await getSetting('welcomed').catch(() => '1')
    await router.isReady()
    if (!welcomed) await router.replace({ name: 'welcome' })
    booting.value = false
  })
  .catch((e) => { error.value = e.message })

const showTabBar = computed(() => !booting.value && route.meta.tab && !sheetOpen.value)
</script>

<template>
  <div class="app">
    <RouterView />
    <TabBar v-if="showTabBar" />
    <Transition name="fade">
      <LoadingScreen v-if="booting" :error="error" />
    </Transition>
  </div>
</template>

<style>
.fade-leave-active { transition: opacity 0.25s; }
.fade-leave-to { opacity: 0; }
</style>
