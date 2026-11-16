import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from './views/HomeView.vue'

// Hash history: works on any static host and inside the Capacitor webview without rewrites.
export default createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/search', name: 'search', component: () => import('./views/SearchView.vue') },
    { path: '/results', name: 'results', component: () => import('./views/ResultsView.vue') },
    { path: '/word/:w', name: 'word', component: () => import('./views/WordView.vue') },
    { path: '/history', name: 'history', component: () => import('./views/HistoryView.vue') },
  ],
  scrollBehavior: (to, from, saved) => saved || { top: 0 },
})
