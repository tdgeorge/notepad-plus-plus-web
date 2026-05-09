import test from 'node:test'
import assert from 'node:assert/strict'
import { getTextChange, buildMacroTextStep } from './macroTextSteps.mjs'

function applyRecordedStep(state, step) {
  const { text, cursor } = state
  const rawStart = Number.isFinite(step.selectionStart) ? step.selectionStart : cursor
  const rawEnd = Number.isFinite(step.selectionEnd) ? step.selectionEnd : rawStart
  const selectionStart = Math.max(0, Math.min(text.length, Math.floor(rawStart)))
  const selectionEnd = Math.max(selectionStart, Math.min(text.length, Math.floor(rawEnd)))

  switch (step.action) {
    case 'replace-selection': {
      const inserted = typeof step.text === 'string' ? step.text : ''
      return {
        text: `${text.slice(0, selectionStart)}${inserted}${text.slice(selectionEnd)}`,
        cursor: selectionStart + inserted.length,
      }
    }
    case 'delete-backward':
      if (selectionStart !== selectionEnd) {
        return { text: `${text.slice(0, selectionStart)}${text.slice(selectionEnd)}`, cursor: selectionStart }
      }
      return selectionStart > 0
        ? { text: `${text.slice(0, selectionStart - 1)}${text.slice(selectionStart)}`, cursor: selectionStart - 1 }
        : state
    case 'delete-forward':
      if (selectionStart !== selectionEnd) {
        return { text: `${text.slice(0, selectionStart)}${text.slice(selectionEnd)}`, cursor: selectionStart }
      }
      return selectionStart < text.length
        ? { text: `${text.slice(0, selectionStart)}${text.slice(selectionStart + 1)}`, cursor: selectionStart }
        : state
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
    inputType: 'insertText',
    inputData: 'brave ',
  })
  assert.deepEqual(step, { action: 'replace-selection', text: 'brave ', selectionStart: 6, selectionEnd: 6 })
})

test('buildMacroTextStep records backward deletion for caret-only backspace', () => {
  const step = buildMacroTextStep('abcd', 'acd', {
    beforeSelectionStart: 2,
    beforeSelectionEnd: 2,
    inputType: 'deleteContentBackward',
  })
  assert.deepEqual(step, { action: 'delete-backward', selectionStart: 2, selectionEnd: 2 })
})

test('buildMacroTextStep records forward deletion for caret-only delete', () => {
  const step = buildMacroTextStep('abcd', 'abd', {
    beforeSelectionStart: 2,
    beforeSelectionEnd: 2,
    inputType: 'deleteContentForward',
  })
  assert.deepEqual(step, { action: 'delete-forward', selectionStart: 2, selectionEnd: 2 })
})

test('buildMacroTextStep records selected range replacement as replace-selection with selection snapshot', () => {
  const step = buildMacroTextStep('hello world', 'hello there', {
    beforeSelectionStart: 6,
    beforeSelectionEnd: 11,
    inputType: 'insertText',
    inputData: 'there',
  })
  assert.deepEqual(step, { action: 'replace-selection', text: 'there', selectionStart: 6, selectionEnd: 11 })
})

test('buildMacroTextStep records selected delete input as replace-selection empty text', () => {
  const step = buildMacroTextStep('abcdef', 'abef', {
    beforeSelectionStart: 2,
    beforeSelectionEnd: 4,
    inputType: 'deleteContentBackward',
  })
  assert.deepEqual(step, { action: 'replace-selection', text: '', selectionStart: 2, selectionEnd: 4 })
})

test('buildMacroTextStep falls back to selection reconstruction when input data is unavailable', () => {
  const step = buildMacroTextStep('abcdef', 'abQQdef', {
    beforeSelectionStart: 2,
    beforeSelectionEnd: 3,
  })
  assert.deepEqual(step, {
    action: 'replace-selection',
    text: 'QQ',
    selectionStart: 2,
    selectionEnd: 3,
  })
})

test('buildMacroTextStep records insertion at intended caret for repeated chars', () => {
  const step = buildMacroTextStep('ababa', 'ababca', {
    beforeSelectionStart: 4,
    beforeSelectionEnd: 4,
    inputType: 'insertText',
    inputData: 'c',
  })
  assert.deepEqual(step, { action: 'replace-selection', text: 'c', selectionStart: 4, selectionEnd: 4 })
})

test('typing, deleting, then typing replays without dropping middle chars', () => {
  const snapshots = [
    { before: '', after: 'a', beforeSelectionStart: 0, beforeSelectionEnd: 0, inputType: 'insertText', inputData: 'a' },
    { before: 'a', after: 'ab', beforeSelectionStart: 1, beforeSelectionEnd: 1, inputType: 'insertText', inputData: 'b' },
    { before: 'ab', after: 'abc', beforeSelectionStart: 2, beforeSelectionEnd: 2, inputType: 'insertText', inputData: 'c' },
    { before: 'abc', after: 'ab', beforeSelectionStart: 3, beforeSelectionEnd: 3, inputType: 'deleteContentBackward' },
    { before: 'ab', after: 'abx', beforeSelectionStart: 2, beforeSelectionEnd: 2, inputType: 'insertText', inputData: 'x' },
    { before: 'abx', after: 'abxy', beforeSelectionStart: 3, beforeSelectionEnd: 3, inputType: 'insertText', inputData: 'y' },
  ]

  const steps = snapshots.map(({ before, after, ...meta }) => buildMacroTextStep(before, after, meta))

  let state = { text: '', cursor: 0 }
  for (const step of steps) state = applyRecordedStep(state, step)

  assert.equal(state.text, 'abxy')
  assert.equal(state.cursor, 4)
})

test('synthetic double-space auto-period replacement records literal selected replacement', () => {
  const step = buildMacroTextStep('word  ', 'word. ', {
    beforeSelectionStart: 4,
    beforeSelectionEnd: 6,
    inputType: 'insertText',
    inputData: '. ',
  })
  assert.deepEqual(step, { action: 'replace-selection', text: '. ', selectionStart: 4, selectionEnd: 6 })
})

test('double-space auto-period playback avoids extra space before period', () => {
  const snapshots = [
    { before: 'word', after: 'word ', beforeSelectionStart: 4, beforeSelectionEnd: 4, inputType: 'insertText', inputData: ' ' },
    { before: 'word  ', after: 'word. ', beforeSelectionStart: 4, beforeSelectionEnd: 6, inputType: 'insertText', inputData: '. ' },
  ]
  const steps = snapshots.map(({ before, after, ...meta }) => buildMacroTextStep(before, after, meta))

  let state = { text: 'word', cursor: 4 }
  for (const step of steps) state = applyRecordedStep(state, step)

  assert.equal(state.text, 'word. ')
  assert.equal(state.cursor, 6)
})

test('caret snapshot auto-period records literal selected replacement when provided by input metadata', () => {
  const step = buildMacroTextStep('testing ', 'testing. ', {
    beforeSelectionStart: 7,
    beforeSelectionEnd: 8,
    inputType: 'insertText',
    inputData: '. ',
  })
  assert.deepEqual(step, { action: 'replace-selection', text: '. ', selectionStart: 7, selectionEnd: 8 })
})

test('caret snapshot auto-period playback keeps punctuation attached to word', () => {
  const snapshots = [
    { before: 'testing', after: 'testing ', beforeSelectionStart: 7, beforeSelectionEnd: 7, inputType: 'insertText', inputData: ' ' },
    { before: 'testing ', after: 'testing. ', beforeSelectionStart: 7, beforeSelectionEnd: 8, inputType: 'insertText', inputData: '. ' },
    { before: 'testing. ', after: 'testing.  ', beforeSelectionStart: 9, beforeSelectionEnd: 9, inputType: 'insertText', inputData: ' ' },
  ]
  const steps = snapshots.map(({ before, after, ...meta }) => buildMacroTextStep(before, after, meta))

  let state = { text: 'testing', cursor: 7 }
  for (const step of steps) state = applyRecordedStep(state, step)

  assert.equal(state.text, 'testing.  ')
  assert.equal(state.cursor, 10)
})
