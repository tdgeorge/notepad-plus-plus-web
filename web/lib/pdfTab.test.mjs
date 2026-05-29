import test from 'node:test'
import assert from 'node:assert/strict'
import { createOpenTabFromFile, createPdfTab, ensurePdfFileName, isPdfFile, isPdfFileName } from './pdfTab.mjs'

test('pdf helpers detect PDF names and mime types', () => {
  assert.equal(isPdfFileName('report.pdf'), true)
  assert.equal(isPdfFileName('REPORT.PDF'), true)
  assert.equal(isPdfFileName('notes.txt'), false)
  assert.equal(isPdfFile({ name: 'report.bin', type: 'application/pdf' }), true)
  assert.equal(isPdfFile({ name: 'report.pdf', type: '' }), true)
  assert.equal(isPdfFile({ name: 'report.txt', type: 'text/plain' }), false)
})

test('ensurePdfFileName appends a missing extension', () => {
  assert.equal(ensurePdfFileName('report'), 'report.pdf')
  assert.equal(ensurePdfFileName('report.pdf'), 'report.pdf')
  assert.equal(ensurePdfFileName('   ', 'fallback.pdf'), 'fallback.pdf')
})

test('createPdfTab normalizes bytes and assigns pdf render mode', () => {
  const next = createPdfTab({ id: 4, name: 'plan', bytes: new Uint8Array([1, 2, 3]) })
  assert.equal(next.name, 'plan.pdf')
  assert.equal(next.renderMode, 'pdf')
  assert.equal(next.content, '')
  assert.deepEqual(Array.from(next.pdfBytes), [1, 2, 3])
  assert.deepEqual(next.pdfAnnotations, [])
})

test('createOpenTabFromFile creates a pdf tab for pdf files', async () => {
  const tab = await createOpenTabFromFile({
    name: 'manual.pdf',
    type: 'application/pdf',
    arrayBuffer: async () => Uint8Array.from([37, 80, 68, 70]).buffer,
  }, 7)

  assert.equal(tab.renderMode, 'pdf')
  assert.equal(tab.name, 'manual.pdf')
  assert.deepEqual(Array.from(tab.pdfBytes), [37, 80, 68, 70])
})

test('createOpenTabFromFile creates a text tab for non-pdf files', async () => {
  const tab = await createOpenTabFromFile({
    name: 'notes.md',
    type: 'text/markdown',
    text: async () => '# hello',
  }, 8, () => 'markdown')

  assert.equal(tab.renderMode, undefined)
  assert.equal(tab.content, '# hello')
  assert.equal(tab.language, 'markdown')
})
