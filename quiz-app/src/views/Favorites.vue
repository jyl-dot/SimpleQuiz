<script setup>
import { computed, ref } from 'vue'
import questions from '../data/questions.json'
import QuestionCard from '../components/QuestionCard.vue'
import { recordAnswer } from '../utils/records.js'
import { loadFavorites, toggleFavorite } from '../utils/favorites.js'

const qMap = computed(() => new Map(questions.map(q => [q.id, q])))
const favIds = ref(loadFavorites())
const favList = computed(() => favIds.value.map(id => qMap.value.get(id)).filter(Boolean))

const openId = ref(null)
const cardSubmitted = ref(false)

function toggleOpen(qid) {
  if (openId.value === qid) {
    openId.value = null
  } else {
    openId.value = qid
    cardSubmitted.value = false
  }
}

function onFavSubmit(ans) {
  // 只更新 records，不改收藏状态
  recordAnswer(qMap.value.get(openId.value), ans)
  cardSubmitted.value = true
}

function toggleFav() {
  favIds.value = toggleFavorite(openId.value)
  // 取消收藏后该题移出列表，闭合卡片
  if (!favIds.value.includes(openId.value)) openId.value = null
}
</script>

<template>
  <div class="favorites">
    <h2>收藏</h2>
    <p v-if="!favList.length" class="empty">暂无收藏</p>
    <ul class="list">
      <li v-for="q in favList" :key="q.id">
        <button class="item" @click="toggleOpen(q.id)">
          <span class="stem">{{ q.stem }}</span>
        </button>
        <QuestionCard
          v-if="openId === q.id"
          :key="q.id"
          :question="q"
          :submitted="cardSubmitted"
          :favorite="true"
          :show-favorite="true"
          @submit="onFavSubmit"
          @toggle-favorite="toggleFav"
        />
      </li>
    </ul>
  </div>
</template>

<style scoped>
.favorites {
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
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

.stem {
  font-size: 15px;
  color: var(--text);
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
