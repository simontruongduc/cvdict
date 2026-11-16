// Mandarin text-to-speech via the Web Speech API (works in Chrome/Safari/Android WebView with a zh voice).
export const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window

export function speak(text) {
  if (!canSpeak) return
  speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'zh-CN'
  const voice = speechSynthesis.getVoices().find((v) => /^zh(-|_)CN/i.test(v.lang)) ||
    speechSynthesis.getVoices().find((v) => /^zh/i.test(v.lang))
  if (voice) u.voice = voice
  u.rate = 0.85
  speechSynthesis.speak(u)
}
