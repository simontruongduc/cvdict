import { createApp } from 'vue'
import { App as NativeApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import App from './App.vue'
import router from './router.js'
import './styles.css'

createApp(App).use(router).mount('#app')

// Android hardware back: let open overlays close themselves first (they cancel the
// 'app-back' event), then walk back through the app's screens, and exit from Home.
if (Capacitor.isNativePlatform()) {
  NativeApp.addListener('backButton', ({ canGoBack }) => {
    if (!window.dispatchEvent(new Event('app-back', { cancelable: true }))) return
    if (router.currentRoute.value.name === 'home') NativeApp.exitApp()
    else if (canGoBack) router.back()
    else router.replace({ name: 'home' })
  })
}
