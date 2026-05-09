import test from 'node:test'
import assert from 'node:assert/strict'
import { getTextChange, buildMacroTextStep } from './macroTextSteps.mjs'

test('getTextChange returns minimal replacement window', () => {
  const change = getTextChange('abcXYZdef', 'abc123def')
  assert.deepEqual(change, { start: 3, end: 6, text: '123' })
})

test('buildMacroTextStep records replacement at current selection', () => {
  const step = buildMacroTextStep('hello world', 'hello brave world', {
    beforeSelectionStart: 6,
    beforeSelectionEnd: 6,
  })
  assert.deepEqual(step, { action: 'replace-selection', text: 'brave ' })
})

test('buildMacroTextStep records backward deletion for caret-only backspace', () => {
  const step = buildMacroTextStep('abcd', 'acd', {
    beforeSelectionStart: 2,
    beforeSelectionEnd: 2,
  })
  assert.deepEqual(step, { action: 'delete-backward' })
})

test('buildMacroTextStep records forward deletion for caret-only delete', () => {
  const step = buildMacroTextStep('abcd', 'abd', {
    beforeSelectionStart: 2,
    beforeSelectionEnd: 2,
  })
  assert.deepEqual(step, { action: 'delete-forward' })
})

test('buildMacroTextStep records selected range replacement', () => {
  const step = buildMacroTextStep('hello world', 'hello there', {
    beforeSelectionStart: 6,
    beforeSelectionEnd: 11,
  })
  assert.deepEqual(step, { action: 'replace-selection', text: 'there' })
})

test('buildMacroTextStep falls back to relative replacement for complex edits', () => {
  const step = buildMacroTextStep('abcdef', 'abQQdef', {
    beforeSelectionStart: 1,
    beforeSelectionEnd: 1,
  })
  assert.deepEqual(step, {
    action: 'replace-relative',
    startOffset: 1,
    endOffset: 2,
    text: 'QQ',
  })
})
