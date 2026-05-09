export function getTextChange(before, after) {
  if (typeof before !== 'string' || typeof after !== 'string') return null
  if (before === after) return null

  let start = 0
  while (start < before.length && start < after.length && before[start] === after[start]) start++

  let beforeEnd = before.length - 1
  let afterEnd = after.length - 1
  while (beforeEnd >= start && afterEnd >= start && before[beforeEnd] === after[afterEnd]) {
    beforeEnd--
    afterEnd--
  }

  return {
    start,
    end: beforeEnd + 1,
    text: after.slice(start, afterEnd + 1),
  }
}

export function buildMacroTextStep(before, after, selectionMeta = {}) {
  if (typeof before !== 'string' || typeof after !== 'string') return null
  if (selectionMeta == null) return null

  const hasSelectionMeta = Number.isFinite(selectionMeta.beforeSelectionStart)
    && Number.isFinite(selectionMeta.beforeSelectionEnd)
  if (!hasSelectionMeta) return null

  const beforeLen = before.length
  const rawStart = Math.floor(selectionMeta.beforeSelectionStart)
  const rawEnd = Math.floor(selectionMeta.beforeSelectionEnd)
  const selectionStart = Math.max(0, Math.min(beforeLen, rawStart))
  const selectionEnd = Math.max(selectionStart, Math.min(beforeLen, rawEnd))
  const stepBase = {
    selectionStart,
    selectionEnd,
  }
  const buildDeleteStep = (action) => (
    selectionStart !== selectionEnd
      ? { action: 'replace-selection', text: '', ...stepBase }
      : { action, ...stepBase }
  )

  const inputType = typeof selectionMeta.inputType === 'string' ? selectionMeta.inputType : ''
  if (inputType === 'deleteContentBackward') {
    return buildDeleteStep('delete-backward')
  }
  if (inputType === 'deleteContentForward') {
    return buildDeleteStep('delete-forward')
  }
  if (typeof selectionMeta.inputData === 'string') {
    return { action: 'replace-selection', text: selectionMeta.inputData, ...stepBase }
  }

  const prefix = before.slice(0, selectionStart)
  const suffix = before.slice(selectionEnd)
  if (after.startsWith(prefix) && after.endsWith(suffix)) {
    const insertedText = after.slice(prefix.length, after.length - suffix.length)
    return { action: 'replace-selection', text: insertedText, ...stepBase }
  }

  const change = getTextChange(before, after)
  if (!change) return null
  return {
    action: 'replace-selection',
    text: change.text,
    selectionStart: change.start,
    selectionEnd: change.end,
  }
}
