<script setup>
import { computed } from 'vue'
import questions from '../data/questions.json'
import { loadRecords } from '../utils/records.js'
import { loadFavorites } from '../utils/favorites.js'
import { loadSession } from '../utils/storage.js'
import { formatDuration } from '../utils/time.js'

// 只读页：每次进入重新计算（computed 读 storage），不写任何存储
const records = computed(() => loadRecords())
const favorites = computed(() => loadFavorites())
const session = computed(() => loadSession())

const qIds = new Set(questions.map(q => q.id))

const overview = computed(() => {
  const valid = Object.entries(records.value).filter(([id]) => qIds.has(id))
  const answered = valid.length
  let mastered = 0
  let wrong = 0
  let totalCorrect = 0
  let totalWrong = 0
  for (const [, r] of valid) {
    totalCorrect += Number(r.correct) || 0
    totalWrong += Number(r.wrong) || 0
    if (r.lastCorrect === true) mastered++
    else if (r.lastCorrect === false) wrong++
  }
  return { answered, mastered, wrong, totalCorrect, totalWrong }
})

const accuracyText = computed(() => {
  const { totalCorrect, totalWrong } = overview.value
  const total = totalCorrect + totalWrong
  if (total === 0) return '--'
  return Math.round((totalCorrect / total) * 1000) / 10 + '%'
})

function modeStat(s) {
  if (!s) return { answered: '未开始', progress: '未开始', duration: '--' }
  const ids = Array.isArray(s.ids) ? s.ids : []
  const answered = Object.keys(s.submitted || {}).filter(id => s.submitted[id]).length
  return {
    answered,
    progress: `${answered} / ${ids.length}`,
    duration: formatDuration(s.elapsedMs),
  }
}

const orderStat = computed(() => {
  const s = session.value && session.value.sessions ? session.value.sessions.order : null
  return modeStat(s)
})

const randomStat = computed(() => {
  const s = session.value && session.value.sessions ? session.value.sessions.random : null
  return modeStat(s)
})
</script>

<template>
  <div class="stats">
    <h2>统计</h2>

    <section class="card">
      <h3>总览</h3>
      <div class="grid">
        <div class="cell"><span class="num">{{ questions.length }}</span><span class="label">题库总数</span></div>
        <div class="cell"><span class="num">{{ overview.answered }}</span><span class="label">已作答</span></div>
        <div class="cell"><span class="num">{{ questions.length - overview.answered }}</span><span class="label">未作答</span></div>
        <div class="cell"><span class="num">{{ overview.mastered }}</span><span class="label">已掌握</span></div>
        <div class="cell"><span class="num">{{ overview.wrong }}</span><span class="label">错题</span></div>
        <div class="cell"><span class="num">{{ favorites.length }}</span><span class="label">收藏</span></div>
      </div>
    </section>

    <section class="card">
      <h3>答题次数</h3>
      <div class="grid">
        <div class="cell">
          <span class="num">{{ overview.totalCorrect + overview.totalWrong }}</span>
          <span class="label">累计作答次数</span>
        </div>
        <div class="cell">
          <span class="num">{{ accuracyText }}</span>
          <span class="label">累计正确率</span>
        </div>
      </div>
    </section>

    <section class="card">
      <h3>练习时长</h3>
      <div class="grid">
        <div class="cell"><span class="num">{{ orderStat.duration }}</span><span class="label">顺序练习</span></div>
        <div class="cell"><span class="num">{{ randomStat.duration }}</span><span class="label">随机练习</span></div>
      </div>
    </section>

    <section class="card">
      <h3>按模式进度</h3>
      <div class="grid">
        <div class="cell"><span class="num">{{ orderStat.progress }}</span><span class="label">顺序已答 / 总数</span></div>
        <div class="cell"><span class="num">{{ randomStat.progress }}</span><span class="label">随机已答 / 总数</span></div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.stats {
  max-width: 640px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

h2 {
  margin: 0 0 4px;
  font-size: 20px;
}

.card {
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 16px;
  background: var(--card);
}

.card h3 {
  margin: 0 0 12px;
  font-size: 15px;
  color: var(--text-2);
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 12px;
}

.cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  min-width: 0;
}

.num {
  font-size: 22px;
  font-weight: bold;
  color: var(--text);
  font-variant-numeric: tabular-nums;
  word-break: break-word;
  text-align: center;
}

.label {
  font-size: 13px;
  color: var(--text-3);
  text-align: center;
}

@media (max-width: 480px) {
  .card {
    padding: 14px;
  }

  .grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .num {
    font-size: 20px;
  }

  .label {
    font-size: 12px;
  }
}
</style>
