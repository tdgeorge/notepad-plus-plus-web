import test from 'node:test'
import assert from 'node:assert/strict'
import { getTextChange, buildMacroTextStep } from './macroTextSteps.mjs'

function applyRecordedStep(state, step) {
  const { text, cursor } = state
  switch (step.action) {
    case 'replace-selection': {
      const inserted = typeof step.text === 'string' ? step.text : ''
      return {
        text: `${text.slice(0, cursor)}${inserted}${text.slice(cursor)}`,
        cursor: cursor + inserted.length,
      }
    }
    case 'delete-backward':
      return cursor > 0
        ? { text: `${text.slice(0, cursor - 1)}${text.slice(cursor)}`, cursor: cursor - 1 }
        : state
    case 'delete-forward':
      return cursor < text.length
        ? { text: `${text.slice(0, cursor)}${text.slice(cursor + 1)}`, cursor }
        : state
    case 'replace-relative': {
      const start = Math.max(0, Math.min(text.length, cursor + step.startOffset))
      const end = Math.max(start, Math.min(text.length, cursor + step.endOffset))
      const inserted = typeof step.text === 'string' ? step.text : ''
      return {
        text: `${text.slice(0, start)}${inserted}${text.slice(end)}`,
        cursor: start + inserted.length,
      }
    }
    case 'replace-range': {
      const start = Math.max(0, Math.min(text.length, step.start))
      const end = Math.max(start, Math.min(text.length, step.end))
      const inserted = typeof step.text === 'string' ? step.text : ''
      return {
        text: `${text.slice(0, start)}${inserted}${text.slice(end)}`,
        cursor: start + inserted.length,
      }
    }
    default:
      return state
  }
}

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

test('buildMacroTextStep records insertion at intended caret for repeated chars', () => {
  const step = buildMacroTextStep('ababa', 'ababca', {
    beforeSelectionStart: 4,
    beforeSelectionEnd: 4,
  })
  assert.deepEqual(step, { action: 'replace-selection', text: 'c' })
})

test('typing, deleting, then typing replays without dropping middle chars', () => {
  const snapshots = [
    { before: '', after: 'a', caretBefore: 0 },
    { before: 'a', after: 'ab', caretBefore: 1 },
    { before: 'ab', after: 'abc', caretBefore: 2 },
    { before: 'abc', after: 'ab', caretBefore: 3 },
    { before: 'ab', after: 'abx', caretBefore: 2 },
    { before: 'abx', after: 'abxy', caretBefore: 3 },
  ]

  const steps = snapshots.map(({ before, after, caretBefore }) => (
    buildMacroTextStep(before, after, {
      beforeSelectionStart: caretBefore,
      beforeSelectionEnd: caretBefore,
    })
  ))

  let state = { text: '', cursor: 0 }
  for (const step of steps) state = applyRecordedStep(state, step)

  assert.equal(state.text, 'abxy')
  assert.equal(state.cursor, 4)
})

test('synthetic double-space auto-period replacement records stable non-caret range step', () => {
  const step = buildMacroTextStep('word  ', 'word. ', {
    beforeSelectionStart: 4,
    beforeSelectionEnd: 6,
  })
  assert.deepEqual(step, { action: 'replace-range', start: 4, end: 6, text: '. ' })
})

test('double-space auto-period playback avoids extra space before period', () => {
  const snapshots = [
    { before: 'word', after: 'word ', beforeSelectionStart: 4, beforeSelectionEnd: 4 },
    { before: 'word  ', after: 'word. ', beforeSelectionStart: 4, beforeSelectionEnd: 6 },
  ]
  const steps = snapshots.map(({ before, after, beforeSelectionStart, beforeSelectionEnd }) => (
    buildMacroTextStep(before, after, { beforeSelectionStart, beforeSelectionEnd })
  ))

  let state = { text: 'word', cursor: 4 }
  for (const step of steps) state = applyRecordedStep(state, step)

  assert.equal(state.text, 'word. ')
})
