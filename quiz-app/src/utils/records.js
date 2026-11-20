import { grade } from './grade.js'

const KEY = 'quiz:records'

export function loadRecords() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

export function saveRecord(qid, patch) {
  const records = loadRecords()
  const prev = records[qid] || {}
  records[qid] = { ...prev, ...patch, updatedAt: Date.now() }
  try {
    localStorage.setItem(KEY, JSON.stringify(records))
  } catch (err) {
    console.warn('保存答题记录失败', err)
  }
}

export function getRecord(qid) {
  return loadRecords()[qid]
}

/**
 * 记录一次作答：判分并累加 correct/wrong、写入 lastCorrect/lastAnswer。
 * 返回是否答对。练习、错题本、收藏页共用，避免重复实现。
 */
export function recordAnswer(question, ans) {
  const ok = grade(question, ans)
  const prev = getRecord(question.id) || { correct: 0, wrong: 0 }
  saveRecord(question.id, {
    correct: (Number(prev.correct) || 0) + (ok ? 1 : 0),
    wrong: (Number(prev.wrong) || 0) + (ok ? 0 : 1),
    lastCorrect: ok,
    lastAnswer: ans,
  })
  return ok
}
