export function shouldApplySelectionBeforeMacroStep(step) {
  if (!step || step.action !== 'replace-selection') return false
  return Number.isFinite(step.selectionStart)
    && Number.isFinite(step.selectionEnd)
    && step.selectionStart !== step.selectionEnd
}

export function resolveMacroPlaybackOffset(currentSelectionStart, recordedStart, existingOffset = null) {
  if (Number.isFinite(existingOffset)) return Math.floor(existingOffset)
  if (!Number.isFinite(currentSelectionStart) || !Number.isFinite(recordedStart)) return 0
  return Math.floor(currentSelectionStart) - Math.floor(recordedStart)
}

export function applyMacroPlaybackOffset(start, end, offset = 0) {
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null
  const safeOffset = Number.isFinite(offset) ? Math.floor(offset) : 0
  const shiftedStart = Math.floor(start) + safeOffset
  const shiftedEnd = Math.floor(end) + safeOffset
  const normalizedStart = Math.min(shiftedStart, shiftedEnd)
  const normalizedEnd = Math.max(shiftedStart, shiftedEnd)
  return { start: normalizedStart, end: normalizedEnd }
}
