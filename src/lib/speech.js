// Text-to-speech. Android's WebView has no Web Speech API, so there we go through the native TTS engine;
// elsewhere (browser, iOS WKWebView) the Web Speech API works with a matching voice.
import { Capacitor } from '@capacitor/core'
import { TextToSpeech } from '@capacitor-community/text-to-speech'

const nativeTTS = Capacitor.getPlatform() === 'android'
const webTTS = typeof window !== 'undefined' && 'speechSynthesis' in window

export const canSpeak = nativeTTS || webTTS

/** lang: 'zh-CN' (default), 'zh-TW' or 'vi-VN'. */
export function speak(text, lang = 'zh-CN') {
  if (!text) return
  if (nativeTTS) speakNative(text, lang)
  else if (webTTS) speakWeb(text, lang)
}

async function speakNative(text, lang) {
  const rate = lang.startsWith('zh') ? 0.85 : 1
  // Fall back to Mandarin when the engine has no voice data for zh-TW.
  const langs = lang === 'zh-TW' ? ['zh-TW', 'zh-CN'] : [lang]
  for (const l of langs) {
    try {
      await TextToSpeech.speak({ text, lang: l, rate })
      return
    } catch (e) {
      console.warn(`TTS failed for ${l}:`, e)
    }
  }
}

function speakWeb(text, lang) {
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
