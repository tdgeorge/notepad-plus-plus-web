import test from 'node:test'
import assert from 'node:assert/strict'
import {
  shouldApplySelectionBeforeMacroStep,
  resolveMacroPlaybackOffset,
  applyMacroPlaybackOffset,
} from './macroPlayback.mjs'

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

test('resolveMacroPlaybackOffset anchors once and preserves offset', () => {
  const initialOffset = resolveMacroPlaybackOffset(15, 5, null)
  assert.equal(initialOffset, 10)
  assert.equal(resolveMacroPlaybackOffset(100, 10, initialOffset), 10)
})

test('applyMacroPlaybackOffset translates and normalizes ranges', () => {
  assert.deepEqual(applyMacroPlaybackOffset(10, 14, 5), { start: 15, end: 19 })
  assert.deepEqual(applyMacroPlaybackOffset(14, 10, 5), { start: 15, end: 19 })
  assert.equal(applyMacroPlaybackOffset(null, 10, 2), null)
})

function applyRangeReplacement(state, start, end, text = '') {
  const safeStart = Math.max(0, Math.min(state.text.length, Math.floor(start)))
  const safeEnd = Math.max(safeStart, Math.min(state.text.length, Math.floor(end)))
  const inserted = typeof text === 'string' ? text : ''
  return {
    text: `${state.text.slice(0, safeStart)}${inserted}${state.text.slice(safeEnd)}`,
    cursor: safeStart + inserted.length,
  }
}

function simulateAbsoluteRangePlayback(steps, initialState) {
  let state = { ...initialState }
  let absoluteOffset = null
  for (const step of steps) {
    if (step.action === 'replace-selection' && shouldApplySelectionBeforeMacroStep(step)) {
      absoluteOffset = resolveMacroPlaybackOffset(state.cursor, step.selectionStart, absoluteOffset)
      const translated = applyMacroPlaybackOffset(step.selectionStart, step.selectionEnd, absoluteOffset)
      state = applyRangeReplacement(state, translated.start, translated.end, step.text)
      continue
    }
    if (step.action === 'replace-range') {
      absoluteOffset = resolveMacroPlaybackOffset(state.cursor, step.start, absoluteOffset)
      const translated = applyMacroPlaybackOffset(step.start, step.end, absoluteOffset)
      state = applyRangeReplacement(state, translated.start, translated.end, step.text)
      continue
    }
    if (step.action === 'replace-selection') {
      state = applyRangeReplacement(state, state.cursor, state.cursor, step.text)
    }
  }
  return state
}

test('applyRangeReplacement clamps out-of-bounds and normalizes non-string text', () => {
  const result = applyRangeReplacement({ text: 'abcd', cursor: 0 }, -10, 99, 7)
  assert.equal(result.text, '')
  assert.equal(result.cursor, 0)
})

test('applyRangeReplacement sets cursor after inserted text length', () => {
  const result = applyRangeReplacement({ text: 'abcd', cursor: 1 }, 1, 3, 'XYZ')
  assert.equal(result.text, 'aXYZd')
  assert.equal(result.cursor, 4)
})

test('simulateAbsoluteRangePlayback handles empty and invalid steps safely', () => {
  const unchanged = simulateAbsoluteRangePlayback([], { text: 'abc', cursor: 1 })
  assert.deepEqual(unchanged, { text: 'abc', cursor: 1 })

  const mixed = simulateAbsoluteRangePlayback(
    [{ action: 'noop' }, { action: 'replace-selection', text: 'x' }],
    { text: 'abc', cursor: 1 },
  )
  assert.deepEqual(mixed, { text: 'axbc', cursor: 2 })
})

test('simulateAbsoluteRangePlayback handles empty initial text with translated range step', () => {
  const result = simulateAbsoluteRangePlayback(
    [{ action: 'replace-range', start: 10, end: 10, text: 'hello' }],
    { text: '', cursor: 0 },
  )
  assert.deepEqual(result, { text: 'hello', cursor: 5 })
})

test('multi-line playback keeps translated absolute range near current cursor', () => {
  const steps = [
    { action: 'replace-selection', text: 'X' },
    { action: 'replace-range', start: 13, end: 13, text: '\nY' },
    { action: 'replace-selection', text: 'Z' },
  ]
  const result = simulateAbsoluteRangePlayback(steps, { text: 'top\nbottom', cursor: 3 })
  assert.equal(result.text, 'topX\nYZ\nbottom')
  assert.equal(result.cursor, 7)
})

test('translated non-caret replace-selection remains relative in complex sequence', () => {
  const steps = [
    { action: 'replace-selection', text: 'A' },
    { action: 'replace-selection', text: 'BC', selectionStart: 8, selectionEnd: 9 },
    { action: 'replace-range', start: 9, end: 11, text: 'D' },
  ]
  const result = simulateAbsoluteRangePlayback(steps, { text: '0123456789', cursor: 2 })
  assert.equal(result.text, '01ABD456789')
  assert.equal(result.cursor, 5)
})
