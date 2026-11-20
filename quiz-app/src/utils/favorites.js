import questions from '../data/questions.json'

const KEY = 'quiz:favorites'
const VALID_IDS = new Set(questions.map(q => q.id))

export function loadFavorites() {
  let list
  try {
    list = JSON.parse(localStorage.getItem(KEY) || '[]')
  } catch {
    return []
  }
  if (!Array.isArray(list)) return []
  return list.filter(id => typeof id === 'string' && VALID_IDS.has(id))
}

export function isFavorite(qid) {
  return loadFavorites().includes(qid)
}

export function toggleFavorite(qid) {
  const list = loadFavorites()
  if (!VALID_IDS.has(qid)) return list
  const idx = list.indexOf(qid)
  if (idx >= 0) list.splice(idx, 1)
  else list.push(qid)
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
  } catch (err) {
    console.warn('保存收藏失败', err)
  }
  return list
}
