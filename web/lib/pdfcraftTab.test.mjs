import test from 'node:test'
import assert from 'node:assert/strict'
import { createPdfcraftTab, PDFCRAFT_URL } from './pdfcraftTab.mjs'

test('createPdfcraftTab builds a pdfcraft render-mode tab', () => {
  const tab = createPdfcraftTab(7)
  assert.equal(tab.id, 7)
  assert.equal(tab.renderMode, 'pdfcraft')
  assert.equal(tab.modified, false)
  assert.match(PDFCRAFT_URL, /^\/pdfcraft\//)
})

test('createPdfcraftTab rejects invalid ids', () => {
  assert.equal(createPdfcraftTab(NaN), null)
})
