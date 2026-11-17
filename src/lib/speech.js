// Text-to-speech via the Web Speech API (works in Chrome/Safari/Android WebView with a matching voice).
export const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window

/** lang: 'zh-CN' (default), 'zh-TW' or 'vi-VN'. */
export function speak(text, lang = 'zh-CN') {
  if (!canSpeak) return
  speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = lang
  const [base, region] = lang.split('-')
  const voices = speechSynthesis.getVoices()
  const voice = voices.find((v) => new RegExp(`^${base}(-|_)${region}`, 'i').test(v.lang)) ||
    voices.find((v) => new RegExp(`^${base}`, 'i').test(v.lang))
  if (voice) u.voice = voice
  u.rate = base === 'zh' ? 0.85 : 1
  speechSynthesis.speak(u)
}
