<script setup>
import { computed, ref } from 'vue'
import { grade } from '../utils/grade.js'
import { resolveImage } from '../utils/image.js'

const props = defineProps({
  question: { type: Object, required: true },
  submitted: { type: Boolean, default: false },
  userAnswer: { type: Array, default: () => [] },
  favorite: { type: Boolean, default: false },
  showFavorite: { type: Boolean, default: false },
})

const emit = defineEmits(['submit', 'toggle-favorite'])

const selected = ref([...props.userAnswer])
const failedImgs = ref({})

const stemSrc = computed(() => resolveImage(props.question.stemImage))
const expSrc = computed(() => resolveImage(props.question.explanationImage))
const isCorrect = computed(() => grade(props.question, selected.value))
// 非法 type 按单选处理，与 choose 的判分行为保持一致
const isMultiple = computed(() => props.question.type === 'multiple')
const groupRole = computed(() => (isMultiple.value ? 'group' : 'radiogroup'))
const optionRole = computed(() => (isMultiple.value ? 'checkbox' : 'radio'))

function choose(key) {
  if (props.submitted) return
  if (isMultiple.value) {
    const i = selected.value.indexOf(key)
    if (i >= 0) selected.value.splice(i, 1)
    else selected.value.push(key)
  } else {
    selected.value = [key]
  }
}

function optionClass(key) {
  if (props.submitted) {
    if (props.question.answer.includes(key)) return 'correct'
    if (selected.value.includes(key)) return 'wrong'
    return ''
  }
  return selected.value.includes(key) ? 'selected' : ''
}

function onImgError(src) {
  failedImgs.value = { ...failedImgs.value, [src]: true }
  console.warn('图片加载失败：', src)
}
</script>

<template>
  <div class="question-card">
    <header v-if="showFavorite" class="card-head">
      <button
        class="fav-btn"
        :class="{ active: favorite }"
        :aria-pressed="favorite"
        @click="emit('toggle-favorite')"
      >
        {{ favorite ? '★ 已收藏' : '☆ 收藏' }}
      </button>
    </header>

    <h2 v-if="question.stem" class="stem">{{ question.stem }}</h2>
    <img
      v-if="stemSrc && !failedImgs[question.stemImage]"
      class="stem-img"
      :src="stemSrc"
      alt="题干配图"
      @error="onImgError(question.stemImage)"
    />

    <ul class="options" :role="groupRole" aria-label="选项">
      <li
        v-for="opt in question.options"
        :key="opt.key"
        class="option"
        :class="optionClass(opt.key)"
        :role="optionRole"
        :aria-checked="selected.includes(opt.key)"
        :aria-disabled="submitted || undefined"
        tabindex="0"
        @click="choose(opt.key)"
        @keydown.enter.prevent="choose(opt.key)"
        @keydown.space.prevent="choose(opt.key)"
      >
        <span class="opt-key">{{ opt.key }}</span>
        <span class="opt-text">{{ opt.text }}</span>
        <img
          v-if="opt.image && !failedImgs[opt.image]"
          class="opt-img"
          :src="resolveImage(opt.image)"
          alt="选项配图"
          loading="lazy"
          decoding="async"
          @error="onImgError(opt.image)"
        />
      </li>
    </ul>

    <div class="actions">
      <button
        v-if="!submitted"
        class="submit"
        :disabled="selected.length === 0"
        @click="emit('submit', [...selected])"
      >提交</button>
    </div>

    <div class="result-live" aria-live="polite" aria-atomic="true">
      <div v-if="submitted" class="result" :class="isCorrect ? 'ok' : 'no'">
        <p class="verdict">{{ isCorrect ? '✓ 回答正确' : '✗ 回答错误' }}</p>
        <p class="answer-line">正确答案：{{ question.answer.join('、') }}</p>
        <p v-if="question.explanation" class="explanation">{{ question.explanation }}</p>
        <img
          v-if="expSrc && !failedImgs[question.explanationImage]"
          class="exp-img"
          :src="expSrc"
          alt="解析配图"
          loading="lazy"
          decoding="async"
          @error="onImgError(question.explanationImage)"
        />
      </div>
    </div>

    <slot name="nav" />
  </div>
</template>

<style scoped>
.question-card {
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 16px;
  background: var(--card);
}

.card-head {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 8px;
}

.fav-btn {
  min-height: 40px;
  border: 1px solid var(--border-strong);
  background: var(--card);
  border-radius: 8px;
  padding: 6px 12px;
  cursor: pointer;
  font-size: 14px;
  color: var(--text-2);
}

.fav-btn.active {
  color: var(--amber);
  border-color: var(--amber-border);
  background: var(--amber-weak);
}

.stem {
  font-size: 17px;
  line-height: 1.5;
  margin: 0 0 12px;
  word-break: break-word;
}

.stem-img,
.exp-img {
  max-width: 100%;
  max-height: 240px;
  object-fit: contain;
  display: block;
  margin: 0 auto 12px;
}

.options {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.option {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 48px;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 10px 12px;
  cursor: pointer;
  font-size: 15px;
  user-select: none;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.15s, border-color 0.15s;
}

.option.selected {
  border-color: var(--blue);
  background: var(--blue-weak);
}

.option.correct {
  border-color: var(--green);
  background: var(--green-weak);
}

.option.wrong {
  border-color: var(--red);
  background: var(--red-weak);
}

.opt-key {
  flex-shrink: 0;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: var(--key-bg);
  color: var(--text-2);
  font-weight: 700;
  font-size: 13px;
}

.option.selected .opt-key {
  background: var(--blue-weak-2);
  color: var(--blue-text);
}

.option.correct .opt-key {
  background: var(--green-weak-2);
  color: var(--green-text);
}

.option.wrong .opt-key {
  background: var(--red-weak-2);
  color: var(--red-text);
}

.opt-text {
  flex: 1;
  word-break: break-word;
}

.opt-img {
  max-width: 100%;
  max-height: 80px;
  object-fit: contain;
}

.actions {
  margin-top: 12px;
}

.submit {
  min-height: 44px;
  background: var(--blue);
  color: var(--on-accent);
  border: none;
  border-radius: 8px;
  padding: 8px 24px;
  cursor: pointer;
  font-size: 15px;
  font-weight: 600;
}

.submit:disabled {
  background: var(--disabled);
  cursor: not-allowed;
}

.result {
  margin-top: 12px;
  border-top: 1px dashed var(--border);
  padding-top: 12px;
  animation: result-in 0.18s ease-out;
}

@keyframes result-in {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
}

.verdict {
  font-weight: bold;
  margin: 0 0 4px;
}

.result.ok .verdict {
  color: var(--green-text);
}

.result.no .verdict {
  color: var(--red-text);
}

.answer-line {
  margin: 0 0 4px;
  color: var(--text-2);
  word-break: break-word;
}

.explanation {
  color: var(--text-2);
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
}

@media (max-width: 480px) {
  .question-card {
    padding: 12px;
  }

  .stem {
    font-size: 16px;
  }

  .option {
    font-size: 16px;
  }

  .stem-img,
  .exp-img {
    max-height: 200px;
  }

  .actions {
    margin-top: 14px;
  }

  .submit {
    width: 100%;
    min-height: 48px;
    font-size: 16px;
  }
}
</style>
