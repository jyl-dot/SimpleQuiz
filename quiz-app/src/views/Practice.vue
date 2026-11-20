<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import questions from '../data/questions.json'
import QuestionCard from '../components/QuestionCard.vue'
import QuestionList from '../components/QuestionList.vue'
import { loadSession, saveSession } from '../utils/storage.js'
import { recordAnswer } from '../utils/records.js'
import { loadFavorites, toggleFavorite } from '../utils/favorites.js'
import { shuffle } from '../utils/shuffle.js'
import { formatDuration } from '../utils/time.js'

const allIds = questions.map(q => q.id)
const qMap = computed(() => new Map(questions.map(q => [q.id, q])))
const session = ref({ version: 2, mode: 'order', sessions: { order: null, random: null } })

// 本地收藏镜像：toggle 后用返回值刷新，避免 computed 缓存导致 ★ 状态不同步
const favList = ref(loadFavorites())

const listOpen = ref(false)

const activeSession = computed(() => session.value.sessions[session.value.mode])
const current = computed(() => (activeSession.value ? qMap.value.get(activeSession.value.ids[activeSession.value.index]) : undefined))
const curAnswer = computed(() => (current.value ? activeSession.value.answers[current.value.id] || [] : []))
const curSubmitted = computed(() => (current.value ? !!activeSession.value.submitted[current.value.id] : false))
const curFavorite = computed(() => (current.value ? favList.value.includes(current.value.id) : false))
const total = computed(() => (activeSession.value ? activeSession.value.ids.length : 0))
const answeredCount = computed(() => (activeSession.value ? Object.keys(activeSession.value.submitted).filter(id => activeSession.value.submitted[id]).length : 0))
const elapsedText = computed(() => (activeSession.value ? formatDuration(activeSession.value.elapsedMs) : '--'))

function persist() {
  saveSession(session.value)
}

function createSession(mode) {
  const ids = mode === 'random' ? shuffle(allIds) : allIds
  return { ids, index: 0, answers: {}, submitted: {}, elapsedMs: 0 }
}

function repairSession(s, mode) {
  const ids = Array.isArray(s.ids) ? s.ids : []
  const validIds = ids.filter(id => qMap.value.has(id))
  const missingIds = allIds.filter(id => !validIds.includes(id))
  // 随机模式只保留仍存在的题，不追加；题库全变则重新洗牌
  if (mode === 'random' && validIds.length === 0 && allIds.length > 0) {
    return createSession(mode)
  }
  s.ids = mode === 'random' ? validIds : [...validIds, ...missingIds]
  s.index = Math.min(Math.max(s.index, 0), Math.max(s.ids.length - 1, 0))
  s.elapsedMs = Number.isFinite(s.elapsedMs) ? s.elapsedMs : 0
  if (!s.answers || typeof s.answers !== 'object' || Array.isArray(s.answers)) s.answers = {}
  if (!s.submitted || typeof s.submitted !== 'object' || Array.isArray(s.submitted)) s.submitted = {}
  const idSet = new Set(s.ids)
  for (const key of Object.keys(s.answers)) if (!idSet.has(key)) delete s.answers[key]
  for (const key of Object.keys(s.submitted)) if (!idSet.has(key)) delete s.submitted[key]
  return s
}

function init() {
  const loaded = loadSession()
  if (loaded) {
    for (const m of ['order', 'random']) {
      if (loaded.sessions[m]) loaded.sessions[m] = repairSession(loaded.sessions[m], m)
    }
    // 当前模式会话缺失时补齐
    if (!loaded.sessions[loaded.mode]) loaded.sessions[loaded.mode] = createSession(loaded.mode)
    session.value = loaded
    persist()
  } else {
    session.value = { version: 2, mode: 'order', sessions: { order: createSession('order'), random: null } }
    persist()
  }
}

function switchMode(m) {
  if (m === session.value.mode) return
  if (!session.value.sessions[m]) session.value.sessions[m] = createSession(m)
  session.value.mode = m
  persist()
}

function onSubmit(ans) {
  const s = activeSession.value
  const q = current.value
  s.answers[q.id] = ans
  s.submitted[q.id] = true
  recordAnswer(q, ans)
  persist()
}

function toggleFav() {
  favList.value = toggleFavorite(current.value.id)
}

function selectFromList(i) {
  const s = activeSession.value
  if (!s || i < 0 || i >= s.ids.length) return
  s.index = i
  persist()
  listOpen.value = false
}

function go(step) {
  const s = activeSession.value
  const next = s.index + step
  if (next < 0 || next >= s.ids.length) return
  s.index = next
  persist()
}

function restart() {
  if (!confirm('确定重新开始？当前模式的进度会被清空。')) return
  session.value.sessions[session.value.mode] = createSession(session.value.mode)
  persist()
}

let timer = null
let tickCount = 0

onMounted(() => {
  init()
  timer = setInterval(() => {
    const s = session.value.sessions[session.value.mode]
    if (s) {
      s.elapsedMs += 1000
      tickCount++
      if (tickCount % 5 === 0) persist()
    }
  }, 1000)
})

onUnmounted(() => {
  clearInterval(timer)
  persist()
})
</script>

<template>
  <div class="practice">
    <div class="toolbar">
      <div class="modes">
        <button :class="{ active: session.mode === 'order' }" @click="switchMode('order')">顺序练习</button>
        <button :class="{ active: session.mode === 'random' }" @click="switchMode('random')">随机练习</button>
      </div>
      <span class="progress">第 {{ activeSession ? activeSession.index + 1 : 0 }} / {{ total }} 题 · 已答 {{ answeredCount }}</span>
      <span class="timer">⏱ {{ elapsedText }}</span>
      <button class="list-btn" @click="listOpen = true">题目列表</button>
      <button class="restart" @click="restart">重新开始</button>
    </div>

    <QuestionCard
      v-if="current"
      :key="current.id"
      :question="current"
      :submitted="curSubmitted"
      :user-answer="curAnswer"
      :favorite="curFavorite"
      :show-favorite="true"
      @submit="onSubmit"
      @toggle-favorite="toggleFav"
    >
      <template #nav>
        <div class="nav">
          <button :disabled="!activeSession || activeSession.index === 0" @click="go(-1)">上一题</button>
          <button :disabled="!activeSession || activeSession.index >= total - 1" @click="go(1)">下一题</button>
        </div>
      </template>
    </QuestionCard>

    <p v-else class="empty">题库为空</p>

    <QuestionList
      v-if="listOpen"
      :ids="activeSession ? activeSession.ids : []"
      :submitted="activeSession ? activeSession.submitted : {}"
      :index="activeSession ? activeSession.index : 0"
      @select="selectFromList"
      @close="listOpen = false"
    />
  </div>
</template>

<style scoped>
.practice {
  max-width: 640px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--text-2);
}

.modes {
  display: flex;
  gap: 8px;
}

.modes button,
.list-btn,
.restart {
  min-height: 40px;
  border: 1px solid var(--border-strong);
  background: var(--card);
  border-radius: 8px;
  padding: 6px 14px;
  cursor: pointer;
  font-size: 14px;
  color: var(--text-2);
}

.modes button.active {
  background: var(--blue);
  border-color: var(--blue);
  color: var(--on-accent);
  font-weight: 600;
}

.progress {
  margin-left: auto;
}

.timer {
  font-variant-numeric: tabular-nums;
}

.nav {
  margin-top: 12px;
  display: flex;
  gap: 8px;
}

.nav button {
  min-height: 44px;
  border: 1px solid var(--border-strong);
  background: var(--card);
  border-radius: 8px;
  padding: 6px 18px;
  cursor: pointer;
  font-size: 15px;
  color: var(--text-2);
}

.nav button:disabled {
  color: var(--text-4);
  cursor: not-allowed;
}

.empty {
  text-align: center;
  color: var(--text-3);
}

@media (max-width: 480px) {
  .toolbar {
    display: grid;
    grid-template-columns: 1fr auto auto;
    gap: 8px;
  }

  .modes {
    grid-column: 1 / -1;
  }

  .modes button {
    flex: 1;
    min-height: 44px;
    font-size: 15px;
  }

  .progress {
    grid-column: 1 / -1;
    margin-left: 0;
    text-align: center;
    font-size: 13px;
  }

  .timer {
    font-size: 13px;
    align-self: center;
  }

  .list-btn,
  .restart {
    min-height: 40px;
    padding: 0 12px;
    font-size: 13px;
  }

  .nav button {
    flex: 1;
    min-height: 48px;
  }
}
</style>
