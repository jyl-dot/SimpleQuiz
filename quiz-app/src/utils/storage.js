const KEY = 'quiz:session'
const BACKUP_KEY = 'quiz:session:backup'

function backup() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw !== null) localStorage.setItem(BACKUP_KEY, raw)
  } catch (err) {
    console.warn('备份会话数据失败', err)
  }
}

function migrateV1(old) {
  return {
    version: 2,
    mode: 'order',
    sessions: {
      order: {
        ids: Array.isArray(old.ids) ? old.ids : [],
        index: Number.isFinite(old.index) ? old.index : 0,
        answers: old.answers && typeof old.answers === 'object' ? old.answers : {},
        submitted: old.submitted && typeof old.submitted === 'object' ? old.submitted : {},
        elapsedMs: 0,
      },
      random: null,
    },
  }
}

function isSessionValue(v) {
  return v === null || (typeof v === 'object' && !Array.isArray(v))
}

function isValid(s) {
  if (!s || typeof s !== 'object' || Array.isArray(s)) return false
  if (s.version !== 2) return false
  if (s.mode !== 'order' && s.mode !== 'random') return false
  if (!s.sessions || typeof s.sessions !== 'object' || Array.isArray(s.sessions)) return false
  if (!('order' in s.sessions) || !('random' in s.sessions)) return false
  return isSessionValue(s.sessions.order) && isSessionValue(s.sessions.random)
}

export function loadSession() {
  let raw
  try {
    raw = localStorage.getItem(KEY)
  } catch (err) {
    console.warn('读取会话失败', err)
    return null
  }
  if (raw === null) return null

  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch {
    backup()
    return null
  }

  // v1 旧结构无 version 字段，先备份再迁移，不丢进度
  if (parsed && typeof parsed === 'object' && !('version' in parsed) && Array.isArray(parsed.ids)) {
    backup()
    return migrateV1(parsed)
  }

  if (!isValid(parsed)) {
    backup()
    return null
  }
  return parsed
}

export function saveSession(session) {
  try {
    localStorage.setItem(KEY, JSON.stringify(session))
  } catch (err) {
    console.warn('保存会话失败', err)
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(KEY)
  } catch (err) {
    console.warn('清除会话失败', err)
  }
}
