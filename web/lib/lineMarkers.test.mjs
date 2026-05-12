import test from 'node:test'
import assert from 'node:assert/strict'
import {
  remapLineSetAfterEdit,
  getLineTextBySet,
  removeLinesBySet,
  replaceLinesBySet,
  invertLineSet,
  getLineStartOffset,
} from './lineMarkers.mjs'

test('remapLineSetAfterEdit shifts lines after inserted newline', () => {
  const before = 'a\nb\nc'
  const after = 'a\nb\nnew\nc'
  const lines = new Set([2])
  assert.deepEqual([...remapLineSetAfterEdit(lines, before, after)], [3])
})

test('remapLineSetAfterEdit keeps touched bookmarks on surviving edited line', () => {
  const before = 'a\nb\nc'
  const after = 'a\nB\nc'
  const lines = new Set([1])
  assert.deepEqual([...remapLineSetAfterEdit(lines, before, after)], [1])
})

test('removeLinesBySet can remove selected or unselected sets', () => {
  const text = 'a\nb\nc\nd'
  const lines = new Set([1, 3])
  assert.equal(removeLinesBySet(text, lines, true), 'a\nc')
  assert.equal(removeLinesBySet(text, lines, false), 'b\nd')
})

test('replaceLinesBySet replaces only targeted lines', () => {
  const text = 'x\ny\nz'
  const lines = new Set([0, 2])
  assert.equal(replaceLinesBySet(text, lines, 'q'), 'q\ny\nq')
})

test('getLineTextBySet returns joined selected lines in order', () => {
  const text = 'zero\none\ntwo'
  const lines = new Set([2, 0])
  assert.equal(getLineTextBySet(text, lines), 'zero\ntwo')
})

test('invertLineSet returns complement within line count', () => {
  assert.deepEqual([...invertLineSet(new Set([1, 3]), 5)], [0, 2, 4])
})

test('getLineStartOffset returns start position for each line', () => {
  const text = 'ab\ncd\nef'
  assert.equal(getLineStartOffset(text, 0), 0)
  assert.equal(getLineStartOffset(text, 1), 3)
  assert.equal(getLineStartOffset(text, 2), 6)
})
