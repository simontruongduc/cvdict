// Shared UI state across views.
import { ref } from 'vue'

/** True while a bottom sheet (handwriting pad) covers the screen; hides the tab bar. */
export const sheetOpen = ref(false)
