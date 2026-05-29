import test from 'node:test'
import assert from 'node:assert/strict'
import { PDFDocument } from 'pdf-lib'
import { applyPdfEditsToBytes, getPdfSavePickerOptions } from './pdfEdits.mjs'

test('getPdfSavePickerOptions suggests a pdf filename', () => {
  const options = getPdfSavePickerOptions('report')
  assert.equal(options.suggestedName, 'report.pdf')
  assert.deepEqual(options.types, [{ description: 'PDF files', accept: { 'application/pdf': ['.pdf'] } }])
})

test('applyPdfEditsToBytes returns original bytes when there are no edits', async () => {
  const pdf = await PDFDocument.create()
  pdf.addPage([300, 200])
  const original = await pdf.save()
  const next = await applyPdfEditsToBytes(original, [])
  assert.deepEqual(Array.from(next), Array.from(original))
})

test('applyPdfEditsToBytes applies text and highlight annotations', async () => {
  const pdf = await PDFDocument.create()
  pdf.addPage([300, 200])
  const original = await pdf.save()
  const next = await applyPdfEditsToBytes(original, [
    { type: 'text', pageNumber: 1, x: 40, y: 30, scale: 1, color: '#ff0000', text: 'Hello PDF', fontSize: 14 },
    { type: 'highlight', pageNumber: 1, x: 38, y: 24, width: 100, height: 18, scale: 1, color: '#ffeb3b' },
  ])

  assert.ok(next.length > original.length)
  const reloaded = await PDFDocument.load(next)
  assert.equal(reloaded.getPageCount(), 1)
})
