// Swipe-left-to-reveal a row action (iOS list style), one row open at a time.
// Shared by the recent-history list and the saved-words list.
import { ref } from 'vue'

export const ACTION_W = 88

/** locked(): true while swiping is disabled (e.g. in edit mode). */
export function useSwipeRows(locked = () => false) {
  const openKey = ref(null)
  const drag = ref(null) // { key, x0, y0, base, dx, moved, horiz }

  function offset(key) {
    if (drag.value?.key === key && drag.value.horiz) return drag.value.dx
    return openKey.value === key ? -ACTION_W : 0
  }

  const rowStyle = (key) => ({
    transform: `translateX(${offset(key)}px)`,
    transition: drag.value?.key === key ? 'none' : 'transform 0.2s',
  })

  function onDown(e, key) {
    if (locked()) return
    drag.value = { key, x0: e.clientX, y0: e.clientY, base: offset(key), dx: offset(key), moved: false, horiz: false }
  }
  function onMove(e) {
    const d = drag.value
    if (!d) return
    const mx = e.clientX - d.x0, my = e.clientY - d.y0
    if (!d.moved && Math.hypot(mx, my) > 8) {
      d.moved = true
      d.horiz = Math.abs(mx) > Math.abs(my)
      if (d.horiz) e.currentTarget.setPointerCapture?.(e.pointerId)
    }
    if (d.horiz) d.dx = Math.max(-ACTION_W * 1.3, Math.min(0, d.base + mx))
  }
  function onUp() {
    const d = drag.value
    if (!d) return
    if (d.horiz) openKey.value = d.dx < -ACTION_W / 2 ? d.key : null
    drag.value = null
  }

  /** For the row's click handler: true when the click only ends a swipe or closes an open row. */
  function swallowClick() {
    if (drag.value?.moved) return true
    if (openKey.value) { openKey.value = null; return true }
    return false
  }

  return { openKey, drag, offset, rowStyle, onDown, onMove, onUp, swallowClick }
}
