export function shouldApplySelectionBeforeMacroStep(step) {
  if (!step || step.action !== 'replace-selection') return false
  return Number.isFinite(step.selectionStart)
    && Number.isFinite(step.selectionEnd)
    && step.selectionStart !== step.selectionEnd
}
