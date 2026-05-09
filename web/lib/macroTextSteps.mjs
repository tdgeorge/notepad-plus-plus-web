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
  const hasSelectionMeta = Number.isFinite(selectionMeta.beforeSelectionStart)
    && Number.isFinite(selectionMeta.beforeSelectionEnd)

  if (hasSelectionMeta && typeof before === 'string' && typeof after === 'string') {
    const beforeLen = before.length
    const afterLen = after.length
    const rawStart = Math.floor(selectionMeta.beforeSelectionStart)
    const rawEnd = Math.floor(selectionMeta.beforeSelectionEnd)
    const selectionStart = Math.max(0, Math.min(beforeLen, rawStart))
    const selectionEnd = Math.max(selectionStart, Math.min(beforeLen, rawEnd))
    const replacedLen = selectionEnd - selectionStart
    const insertedLen = afterLen - (beforeLen - replacedLen)

    if (insertedLen >= 0) {
      const insertedText = after.slice(selectionStart, selectionStart + insertedLen)
      const reconstructedText = `${before.slice(0, selectionStart)}${insertedText}${before.slice(selectionEnd)}`

      if (reconstructedText === after) {
        let hasCachedMinimalChange = false
        let cachedMinimalChange = null
        const getMinimalChange = () => {
          if (!hasCachedMinimalChange) {
            cachedMinimalChange = getTextChange(before, after)
            hasCachedMinimalChange = true
          }
          return cachedMinimalChange
        }

        if (selectionStart === selectionEnd && insertedLen === 0) {
          const backspaceCandidate = `${before.slice(0, selectionStart - 1)}${before.slice(selectionStart)}`
          if (selectionStart > 0 && backspaceCandidate === after) {
            return { action: 'delete-backward' }
          }
          const deleteCandidate = `${before.slice(0, selectionStart)}${before.slice(selectionStart + 1)}`
          if (selectionStart < beforeLen && deleteCandidate === after) {
            return { action: 'delete-forward' }
          }
        }
        if (selectionStart === selectionEnd) {
          const minimalChange = getMinimalChange()
          if (minimalChange
            && (minimalChange.start !== selectionStart || minimalChange.end !== selectionEnd)) {
            return {
              action: 'replace-relative',
              startOffset: minimalChange.start - selectionStart,
              endOffset: minimalChange.end - selectionStart,
              text: minimalChange.text,
            }
          }
        } else {
          return {
            action: 'replace-range',
            start: selectionStart,
            end: selectionEnd,
            text: insertedText,
          }
        }
        return { action: 'replace-selection', text: insertedText }
      }
    }
  }

  const change = getTextChange(before, after)
  if (!change) return null

  const rawStart = Number.isFinite(selectionMeta.beforeSelectionStart) ? selectionMeta.beforeSelectionStart : change.start
  const rawEnd = Number.isFinite(selectionMeta.beforeSelectionEnd) ? selectionMeta.beforeSelectionEnd : rawStart
  const selectionStart = Math.max(0, Math.floor(rawStart))
  const selectionEnd = Math.max(selectionStart, Math.floor(rawEnd))

  if (change.start === selectionStart && change.end === selectionEnd) {
    return { action: 'replace-selection', text: change.text }
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
