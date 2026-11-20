export function grade(question, userAnswer) {
  if (!Array.isArray(userAnswer) || userAnswer.length === 0) return false
  const right = [...question.answer].sort().join(',')
  const given = [...userAnswer].sort().join(',')
  return right === given
}
