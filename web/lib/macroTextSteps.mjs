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
  const change = getTextChange(before, after)
  if (!change) return null

  const rawStart = Number.isFinite(selectionMeta.beforeSelectionStart) ? selectionMeta.beforeSelectionStart : change.start
  const rawEnd = Number.isFinite(selectionMeta.beforeSelectionEnd) ? selectionMeta.beforeSelectionEnd : rawStart
  const selectionStart = Math.max(0, Math.floor(rawStart))
  const selectionEnd = Math.max(selectionStart, Math.floor(rawEnd))

  if (change.start === selectionStart && change.end === selectionEnd) {
    if (change.text.length > 0) return { action: 'replace-selection', text: change.text }
    return { action: 'replace-selection', text: '' }
  }

  if (selectionStart === selectionEnd && change.text === '') {
    if (change.start === selectionStart - 1 && change.end === selectionStart) {
      return { action: 'delete-backward' }
    }
    if (change.start === selectionStart && change.end === selectionStart + 1) {
      return { action: 'delete-forward' }
    }
  }

  return {
    action: 'replace-relative',
    startOffset: change.start - selectionStart,
    endOffset: change.end - selectionStart,
    text: change.text,
  }
}
