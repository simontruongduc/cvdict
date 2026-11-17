import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from './views/HomeView.vue'

// Hash history: works on any static host and inside the Capacitor webview without rewrites.
// meta.tab marks which tab-bar item a screen belongs to (no tab = no tab bar).
export default createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView, meta: { tab: 'search' } },
    { path: '/welcome', name: 'welcome', component: () => import('./views/WelcomeView.vue') },
    { path: '/search', name: 'search', component: () => import('./views/SearchView.vue'), meta: { tab: 'search' } },
    { path: '/results', name: 'results', component: () => import('./views/ResultsView.vue'), meta: { tab: 'search' } },
    { path: '/word/:w', name: 'word', component: () => import('./views/WordView.vue'), meta: { tab: 'search' } },
    { path: '/sentence', name: 'sentence', component: () => import('./views/SentenceView.vue'), meta: { tab: 'search' } },
    { path: '/translate', name: 'translate', component: () => import('./views/TranslateView.vue'), meta: { tab: 'translate' } },
    { path: '/saved', name: 'saved', component: () => import('./views/SavedView.vue'), meta: { tab: 'saved' } },
    { path: '/settings', name: 'settings', component: () => import('./views/SettingsView.vue'), meta: { tab: 'settings' } },
    { path: '/history', redirect: { name: 'saved' } },
  ],
  scrollBehavior: (to, from, saved) => saved || { top: 0 },
})
