<script setup>
// Inline stroke icons matching the mockup.
defineProps({ name: { type: String, required: true }, size: { type: Number, default: 22 } })

const PATHS = {
  back: ['m15 18-6-6 6-6'],
  chevron: ['m9 18 6-6-6-6'],
  search: ['M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z', 'm20 20-3.5-3.5'],
  close: ['M18 6 6 18', 'm6 6 12 12'],
  history: ['M3 12a9 9 0 1 0 3-6.7', 'M3 4v5h5', 'M12 7v5l3 2'],
  bookmark: ['M6 3h12v18l-6-4-6 4z'],
  copy: ['M10 8h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2z', 'M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3'],
  sound: ['M11 5 6 9H3v6h3l5 4z', 'M15.5 8.5a5 5 0 0 1 0 7', 'M18.5 5.5a9 9 0 0 1 0 13'],
  arrow: ['M5 12h14', 'm13 6 6 6-6 6'],
  pen: ['M12 20h9', 'M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z'],
  check: ['m5 12 5 5 9-10'],
  refresh: ['M21 12a9 9 0 1 1-3-6.7', 'M21 4v5h-5'],
  eye: ['M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z', 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z'],
}
</script>

<template>
  <svg
    v-if="name === 'play'"
    :width="size" :height="size" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"
  ><path d="M7 4v16l13-8z" /></svg>
  <svg
    v-else-if="name === 'bookmark-filled'"
    :width="size" :height="size" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor"
    stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"
  ><path d="M6 3h12v18l-6-4-6 4z" /></svg>
  <svg
    v-else
    :width="size" :height="size" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"
  ><path v-for="d in PATHS[name]" :key="d" :d="d" /></svg>
</template>
