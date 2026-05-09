import test from 'node:test'
import assert from 'node:assert/strict'
import { shouldApplySelectionBeforeMacroStep } from './macroPlayback.mjs'

test('does not apply selection for non-macro step shapes', () => {
  assert.equal(shouldApplySelectionBeforeMacroStep(null), false)
  assert.equal(shouldApplySelectionBeforeMacroStep({ action: 'insert-text', text: 'a' }), false)
  assert.equal(shouldApplySelectionBeforeMacroStep({ action: 'replace-range', start: 0, end: 1, text: 'x' }), false)
})

test('does not apply selection for caret-only replace-selection', () => {
  assert.equal(shouldApplySelectionBeforeMacroStep({
    action: 'replace-selection',
    text: 'x',
    selectionStart: 5,
    selectionEnd: 5,
  }), false)
})

test('applies selection for non-caret replace-selection range', () => {
  assert.equal(shouldApplySelectionBeforeMacroStep({
    action: 'replace-selection',
    text: 'x',
    selectionStart: 4,
    selectionEnd: 6,
  }), true)
})
