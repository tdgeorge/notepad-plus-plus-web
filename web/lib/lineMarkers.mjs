export function getLineIndexAtOffset(text, offset) {
  const safeOffset = Math.max(0, Math.min(typeof text === 'string' ? text.length : 0, Number.isFinite(offset) ? Math.floor(offset) : 0))
  return (text.slice(0, safeOffset).match(/\n/g) ?? []).length
}

export function getLineStartOffset(text, lineIndex) {
  const lines = String(text).split('\n')
  const target = Math.max(0, Math.min(lines.length - 1, Number.isFinite(lineIndex) ? Math.floor(lineIndex) : 0))
  let offset = 0
  for (let i = 0; i < target; i++) {
    offset += lines[i].length + 1
  }
  return offset
}

export function normalizeLineSet(lines, lineCount) {
  const max = Math.max(0, Number.isFinite(lineCount) ? Math.floor(lineCount) : 0)
  const next = new Set()
  for (const line of lines ?? []) {
    if (!Number.isFinite(line)) continue
    const safeLine = Math.floor(line)
    if (safeLine >= 0 && safeLine < max) next.add(safeLine)
  }
  return next
}

function findChangedRange(before, after) {
  if (before === after) {
    return {
      start: before.length,
      beforeEndExclusive: before.length,
      afterEndExclusive: after.length,
    }
  }

  let start = 0
  const minLen = Math.min(before.length, after.length)
  while (start < minLen && before[start] === after[start]) start++

  let beforeEnd = before.length - 1
  let afterEnd = after.length - 1
  while (beforeEnd >= start && afterEnd >= start && before[beforeEnd] === after[afterEnd]) {
    beforeEnd--
    afterEnd--
  }

  return {
    start,
    beforeEndExclusive: beforeEnd + 1,
    afterEndExclusive: afterEnd + 1,
  }
}

export function remapLineSetAfterEdit(lines, beforeText, afterText) {
  const before = String(beforeText)
  const after = String(afterText)
  const afterLineCount = after.split('\n').length
  const base = normalizeLineSet(lines, before.split('\n').length)
  if (base.size === 0) return base
  if (before === after) return normalizeLineSet(base, afterLineCount)

  const { start, beforeEndExclusive, afterEndExclusive } = findChangedRange(before, after)
  const deltaChars = (afterEndExclusive - start) - (beforeEndExclusive - start)

  const next = new Set()
  for (const line of base) {
    const lineStart = getLineStartOffset(before, line)
    const remappedOffset = lineStart < start
      ? lineStart
      : (lineStart >= beforeEndExclusive ? lineStart + deltaChars : start)
    next.add(getLineIndexAtOffset(after, remappedOffset))
  }

  return normalizeLineSet(next, afterLineCount)
}

export function getLineTextBySet(text, lines) {
  const allLines = String(text).split('\n')
  const selected = normalizeLineSet(lines, allLines.length)
  return allLines.filter((_, index) => selected.has(index)).join('\n')
}

export function removeLinesBySet(text, lines, removeSelected = true) {
  const allLines = String(text).split('\n')
  const selected = normalizeLineSet(lines, allLines.length)
  const filtered = allLines.filter((_, index) => (removeSelected ? !selected.has(index) : selected.has(index)))
  return filtered.join('\n')
}

export function replaceLinesBySet(text, lines, replacement) {
  const allLines = String(text).split('\n')
  const selected = normalizeLineSet(lines, allLines.length)
  const value = typeof replacement === 'string' ? replacement : ''
  return allLines.map((line, index) => (selected.has(index) ? value : line)).join('\n')
}

export function invertLineSet(lines, lineCount) {
  const selected = normalizeLineSet(lines, lineCount)
  const next = new Set()
  const safeLineCount = Math.max(0, Number.isFinite(lineCount) ? Math.floor(lineCount) : 0)
  for (let i = 0; i < safeLineCount; i++) {
    if (!selected.has(i)) next.add(i)
  }
  return next
}
