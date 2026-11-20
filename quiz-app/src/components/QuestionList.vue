<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { loadRecords } from '../utils/records.js'

const props = defineProps({
  ids: { type: Array, required: true },
  submitted: { type: Object, default: () => ({}) },
  index: { type: Number, default: 0 },
})

const emit = defineEmits(['select', 'close'])

// 打开列表时读取一次，答题记录在本组件打开期间不会变化
const records = loadRecords()

const panelRef = ref(null)
const closeRef = ref(null)
let lastFocused = null

const answeredCount = computed(() => props.ids.filter(id => props.submitted[id]).length)
const currentText = computed(() => (props.ids.length ? `当前第 ${props.index + 1} 题` : '--'))

function isAnswered(id) {
  return !!props.submitted[id]
}

function isWrong(id) {
  return isAnswered(id) && records[id]?.lastCorrect === false
}

function getFocusable() {
  if (!panelRef.value) return []
  return Array.from(
    panelRef.value.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
  ).filter(el => !el.disabled && el.getClientRects().length > 0)
}

function onKeydown(e) {
  if (e.key === 'Escape') {
    e.preventDefault()
    emit('close')
    return
  }
  if (e.key !== 'Tab') return

  // 焦点陷阱：Tab / Shift+Tab 在弹层内循环
  const focusable = getFocusable()
  if (!focusable.length) {
    e.preventDefault()
    return
  }
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  const active = document.activeElement
  const inside = panelRef.value && panelRef.value.contains(active)
  if (e.shiftKey) {
    if (!inside || active === first) {
      e.preventDefault()
      last.focus()
    }
  } else if (!inside || active === last) {
    e.preventDefault()
    first.focus()
  }
}

onMounted(() => {
  lastFocused = document.activeElement
  // 弹层打开时锁定背景滚动，避免移动端滑动穿透
  document.body.style.overflow = 'hidden'
  window.addEventListener('keydown', onKeydown)
  closeRef.value?.focus()
})

onUnmounted(() => {
  document.body.style.overflow = ''
  window.removeEventListener('keydown', onKeydown)
  // 关闭后把焦点还给打开弹层的按钮
  if (lastFocused && typeof lastFocused.focus === 'function' && document.contains(lastFocused)) {
    lastFocused.focus()
  }
})
</script>

<template>
  <div class="overlay" @click.self="emit('close')">
    <div ref="panelRef" class="panel" role="dialog" aria-modal="true" aria-label="题目列表">
      <header class="head">
        <h2>题目列表</h2>
        <button ref="closeRef" class="close" aria-label="关闭" @click="emit('close')">✕</button>
      </header>

      <div class="summary">
        <span>共 {{ ids.length }} 题</span>
        <span>{{ currentText }}</span>
      </div>

      <div class="grid">
        <button
          v-for="(id, i) in ids"
          :key="id"
          class="num"
          :class="{ answered: isAnswered(id), wrong: isWrong(id), current: i === index }"
          :aria-label="`第 ${i + 1} 题${isAnswered(id) ? '，已完成' : ''}`"
          :aria-current="i === index ? 'true' : undefined"
          @click="emit('select', i)"
        >{{ i + 1 }}</button>
      </div>

      <footer class="foot">已完成 {{ answeredCount }} / {{ ids.length }}</footer>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: var(--overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  overscroll-behavior: contain;
  animation: overlay-in 0.18s ease-out;
}

.panel {
  width: 100%;
  max-width: 480px;
  max-height: min(640px, 85dvh);
  display: flex;
  flex-direction: column;
  background: var(--card);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 20px 48px var(--shadow);
  animation: panel-in 0.18s ease-out;
}

@keyframes overlay-in {
  from {
    opacity: 0;
  }
}

@keyframes panel-in {
  from {
    opacity: 0;
    transform: translateY(12px) scale(0.98);
  }
}

.head {
  position: relative;
  flex-shrink: 0;
  padding: 16px;
  border-bottom: 1px solid var(--border);
  text-align: center;
}

.head h2 {
  margin: 0;
  font-size: 17px;
}

.close {
  position: absolute;
  top: 50%;
  right: 6px;
  transform: translateY(-50%);
  width: 44px;
  height: 44px;
  border: none;
  background: transparent;
  color: var(--text-3);
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  border-radius: 50%;
}

.summary {
  flex-shrink: 0;
  display: flex;
  justify-content: space-between;
  padding: 12px 16px 0;
  font-size: 13px;
  color: var(--text-3);
}

.grid {
  flex: 1;
  overflow-y: auto;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(44px, 1fr));
  gap: 10px;
  padding: 16px;
  align-content: start;
  overscroll-behavior: contain;
}

.num {
  width: 100%;
  aspect-ratio: 1;
  border: 1px solid var(--border);
  border-radius: 50%;
  background: var(--card);
  color: var(--text-2);
  font-size: 14px;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

.num.answered {
  background: var(--blue-weak);
  border-color: var(--blue-border);
  color: var(--blue-text);
}

.num.wrong {
  background: var(--red-weak);
  border-color: var(--red-border);
  color: var(--red-text);
}

.num.current {
  background: var(--blue);
  border-color: var(--blue);
  color: var(--on-accent);
  font-weight: 600;
}

/* 当前题恰好答错时，保留淡红底，用蓝色外环标识当前位置 */
.num.current.wrong {
  background: var(--red-weak);
  border-color: var(--red-border);
  color: var(--red-text);
  box-shadow: 0 0 0 2px var(--blue);
}

.foot {
  flex-shrink: 0;
  padding: 14px 16px;
  padding-bottom: calc(14px + env(safe-area-inset-bottom));
  border-top: 1px solid var(--border);
  text-align: center;
  font-size: 14px;
  color: var(--text-2);
}

@media (max-width: 480px) {
  .overlay {
    padding: 0;
  }

  .panel {
    max-width: none;
    max-height: none;
    height: 100dvh;
    border-radius: 0;
  }

  .head {
    padding-top: calc(16px + env(safe-area-inset-top));
  }

  .grid {
    gap: 10px;
    padding: 16px 16px 20px;
  }
}
</style>
