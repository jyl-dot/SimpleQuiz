<script setup>
import { computed, ref } from 'vue'
import questions from '../data/questions.json'
import QuestionCard from '../components/QuestionCard.vue'
import { loadRecords, recordAnswer } from '../utils/records.js'
import { loadFavorites, toggleFavorite } from '../utils/favorites.js'

const qMap = computed(() => new Map(questions.map(q => [q.id, q])))
// 本地镜像：进入页面时读一次 storage，提交/切换收藏后刷新，保证列表与卡片状态同步
const records = ref(loadRecords())
const favIds = ref(loadFavorites())

const wrongList = computed(() => questions.filter(q => records.value[q.id]?.lastCorrect === false))
const openId = ref(null)
const cardSubmitted = ref(false)

function toggleOpen(qid) {
  if (openId.value === qid) {
    openId.value = null
  } else {
    openId.value = qid
    // 重新展开即重新作答（错题本不写 session，卡片提交状态只存于本页）
    cardSubmitted.value = false
  }
}

function truncate(text) {
  return text.length > 30 ? text.slice(0, 30) + '…' : text
}

function onWrongSubmit(ans) {
  recordAnswer(qMap.value.get(openId.value), ans)
  cardSubmitted.value = true
  // 答对后 lastCorrect 变 true，该题自动移出错题列表
  records.value = loadRecords()
}

function toggleFav() {
  favIds.value = toggleFavorite(openId.value)
}
</script>

<template>
  <div class="wrong-book">
    <h2>错题本</h2>
    <p v-if="!wrongList.length" class="empty">暂无错题</p>
    <ul class="list">
      <li v-for="q in wrongList" :key="q.id">
        <button class="item" @click="toggleOpen(q.id)">
          <span class="stem">{{ truncate(q.stem) }}</span>
          <span class="meta">错误 {{ records[q.id].wrong }} 次 · 最近错选 {{ (records[q.id].lastAnswer || []).join('、') }}</span>
        </button>
        <QuestionCard
          v-if="openId === q.id"
          :key="q.id"
          :question="q"
          :submitted="cardSubmitted"
          :favorite="favIds.includes(q.id)"
          :show-favorite="true"
          @submit="onWrongSubmit"
          @toggle-favorite="toggleFav"
        />
      </li>
    </ul>
  </div>
</template>

<style scoped>
.wrong-book {
  max-width: 640px;
  margin: 0 auto;
}

h2 {
  margin: 0 0 12px;
  font-size: 20px;
}

.list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.item {
  width: 100%;
  min-height: 52px;
  text-align: left;
  border: 1px solid var(--border);
  background: var(--card);
  border-radius: 10px;
  padding: 14px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 4px;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

.stem {
  font-size: 15px;
  color: var(--text);
  word-break: break-word;
}

.meta {
  font-size: 13px;
  line-height: 1.5;
  color: var(--red-text);
  word-break: break-word;
}

.list li > .question-card {
  margin-top: 10px;
}

.empty {
  text-align: center;
  color: var(--text-3);
  padding: 32px 0;
}

@media (max-width: 480px) {
  .item {
    padding: 12px;
  }
}
</style>
