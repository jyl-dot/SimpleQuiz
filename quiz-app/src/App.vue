<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import Practice from './views/Practice.vue'
import WrongBook from './views/WrongBook.vue'
import Favorites from './views/Favorites.vue'
import Stats from './views/Stats.vue'

const TABS = [
  { key: 'practice', label: '练习' },
  { key: 'wrong', label: '错题本' },
  { key: 'fav', label: '收藏' },
  { key: 'stats', label: '统计' },
]
const tab = ref('practice')
const currentLabel = computed(() => (TABS.find(t => t.key === tab.value) || TABS[0]).label)

const THEME_KEY = 'quiz:theme'
const THEME_ORDER = ['auto', 'light', 'dark']
const THEME_META = {
  auto: { icon: '🌗', label: '跟随系统' },
  light: { icon: '☀️', label: '浅色' },
  dark: { icon: '🌙', label: '深色' },
}
const THEME_COLORS = { light: '#f8fafc', dark: '#0f172a' }

function loadTheme() {
  try {
    const stored = localStorage.getItem(THEME_KEY)
    return THEME_ORDER.includes(stored) ? stored : 'auto'
  } catch {
    return 'auto'
  }
}

const theme = ref(loadTheme())
const themeMeta = computed(() => THEME_META[theme.value] || THEME_META.auto)
const media = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null

function resolvedTheme(value) {
  if (value === 'light' || value === 'dark') return value
  return media && media.matches ? 'dark' : 'light'
}

function applyTheme() {
  const resolved = resolvedTheme(theme.value)
  document.documentElement.dataset.theme = resolved
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', THEME_COLORS[resolved])
}

function cycleTheme() {
  const i = THEME_ORDER.indexOf(theme.value)
  theme.value = THEME_ORDER[(i + 1) % THEME_ORDER.length]
  try {
    localStorage.setItem(THEME_KEY, theme.value)
  } catch {
    // 存储不可用时仅在当前会话生效
  }
  applyTheme()
}

function onSystemThemeChange() {
  if (theme.value === 'auto') applyTheme()
}

function onTabKeydown(e, i) {
  let next = null
  if (e.key === 'ArrowRight') next = (i + 1) % TABS.length
  else if (e.key === 'ArrowLeft') next = (i - 1 + TABS.length) % TABS.length
  else if (e.key === 'Home') next = 0
  else if (e.key === 'End') next = TABS.length - 1
  if (next === null) return
  e.preventDefault()
  tab.value = TABS[next].key
  const buttons = e.currentTarget.parentElement.querySelectorAll('[role="tab"]')
  if (buttons[next]) buttons[next].focus()
}

onMounted(() => {
  applyTheme()
  if (media) media.addEventListener('change', onSystemThemeChange)
})

onUnmounted(() => {
  if (media) media.removeEventListener('change', onSystemThemeChange)
})
</script>

<template>
  <div class="app">
    <nav class="tabs">
      <div class="tablist" role="tablist" aria-label="主导航">
        <button
          v-for="(t, i) in TABS"
          :key="t.key"
          role="tab"
          :aria-selected="tab === t.key"
          :tabindex="tab === t.key ? 0 : -1"
          :class="{ active: tab === t.key }"
          @click="tab = t.key"
          @keydown="onTabKeydown($event, i)"
        >{{ t.label }}</button>
      </div>
      <button
        class="theme-btn"
        :aria-label="`主题：${themeMeta.label}，点击切换`"
        :title="`主题：${themeMeta.label}`"
        @click="cycleTheme"
      >{{ themeMeta.icon }}</button>
    </nav>

    <main class="view" role="tabpanel" :aria-label="currentLabel">
      <Transition name="fade" mode="out-in">
        <Practice v-if="tab === 'practice'" key="practice" />
        <WrongBook v-else-if="tab === 'wrong'" key="wrong" />
        <Favorites v-else-if="tab === 'fav'" key="fav" />
        <Stats v-else key="stats" />
      </Transition>
    </main>
  </div>
</template>

<style>
:root {
  color-scheme: light;
  --bg: #f8fafc;
  --card: #ffffff;
  --border: #e2e8f0;
  --border-strong: #cbd5e1;
  --text: #0f172a;
  --text-2: #475569;
  --text-3: #64748b;
  --text-4: #94a3b8;
  --blue: #3b82f6;
  --on-accent: #ffffff;
  --blue-weak: #eff6ff;
  --blue-weak-2: #dbeafe;
  --blue-border: #93c5fd;
  --blue-text: #1d4ed8;
  --green: #16a34a;
  --green-weak: #f0fdf4;
  --green-weak-2: #dcfce7;
  --green-text: #15803d;
  --red: #dc2626;
  --red-weak: #fef2f2;
  --red-weak-2: #fee2e2;
  --red-border: #fca5a5;
  --red-text: #b91c1c;
  --amber: #d97706;
  --amber-border: #f59e0b;
  --amber-weak: #fffbeb;
  --key-bg: #f1f5f9;
  --overlay: rgba(15, 23, 42, 0.45);
  --shadow: rgba(15, 23, 42, 0.24);
  --disabled: #cbd5e1;
}

html[data-theme='dark'] {
  color-scheme: dark;
  --bg: #0f172a;
  --card: #1e293b;
  --border: #334155;
  --border-strong: #475569;
  --text: #e2e8f0;
  --text-2: #cbd5e1;
  --text-3: #94a3b8;
  --text-4: #64748b;
  --blue: #3b82f6;
  --blue-weak: rgba(59, 130, 246, 0.16);
  --blue-weak-2: rgba(59, 130, 246, 0.28);
  --blue-border: #60a5fa;
  --blue-text: #93c5fd;
  --green: #22c55e;
  --green-weak: rgba(34, 197, 94, 0.14);
  --green-weak-2: rgba(34, 197, 94, 0.26);
  --green-text: #86efac;
  --red: #ef4444;
  --red-weak: rgba(239, 68, 68, 0.14);
  --red-weak-2: rgba(239, 68, 68, 0.26);
  --red-border: #f87171;
  --red-text: #fca5a5;
  --amber: #fbbf24;
  --amber-border: #f59e0b;
  --amber-weak: rgba(245, 158, 11, 0.16);
  --key-bg: #334155;
  --overlay: rgba(2, 6, 23, 0.66);
  --shadow: rgba(0, 0, 0, 0.5);
  --disabled: #475569;
}

* {
  box-sizing: border-box;
}

html {
  -webkit-text-size-adjust: 100%;
  background: var(--bg);
}

body {
  margin: 0;
  min-height: 100vh;
  min-height: 100dvh;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial,
    'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
  font-size: 16px;
  line-height: 1.5;
  color: var(--text);
  background: var(--bg);
  -webkit-font-smoothing: antialiased;
}

button {
  font-family: inherit;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

img {
  max-width: 100%;
}

:focus-visible {
  outline: 2px solid var(--blue);
  outline-offset: 2px;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    transition: none !important;
    animation: none !important;
    scroll-behavior: auto !important;
  }
}
</style>

<style scoped>
.app {
  max-width: 720px;
  margin: 0 auto;
  padding: 16px;
  padding-top: calc(8px + env(safe-area-inset-top));
  padding-bottom: calc(24px + env(safe-area-inset-bottom));
}

.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  position: sticky;
  top: 0;
  z-index: 10;
  padding: 8px 0;
  background: var(--bg);
}

.tablist {
  display: flex;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.tabs button {
  flex: 1;
  min-width: 0;
  min-height: 44px;
  border: 1px solid var(--border-strong);
  background: var(--card);
  border-radius: 8px;
  cursor: pointer;
  font-size: 15px;
  color: var(--text-2);
}

.tabs button.active {
  background: var(--blue);
  border-color: var(--blue);
  color: var(--on-accent);
  font-weight: 600;
}

.tabs .theme-btn {
  flex: 0 0 auto;
  width: 44px;
  padding: 0;
  font-size: 18px;
  line-height: 1;
}

.view {
  display: block;
}

@media (max-width: 480px) {
  .app {
    padding-left: 12px;
    padding-right: 12px;
  }

  .tabs,
  .tablist {
    gap: 6px;
  }

  .tabs button {
    padding: 0 4px;
    font-size: 14px;
  }

  .tabs .theme-btn {
    font-size: 17px;
  }
}
</style>
