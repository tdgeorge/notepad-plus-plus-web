import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { ensurePdfFileName, normalizePdfBytes, PDF_MIME_TYPE } from './pdfTab.mjs'

function clampNumber(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function hexToRgb(value, fallback) {
  const normalized = typeof value === 'string' ? value.trim() : ''
  const expanded = normalized.length === 4
    ? `#${normalized[1]}${normalized[1]}${normalized[2]}${normalized[2]}${normalized[3]}${normalized[3]}`
    : normalized
  if (!/^#[0-9A-Fa-f]{6}$/.test(expanded)) return fallback
  return rgb(
    parseInt(expanded.slice(1, 3), 16) / 255,
    parseInt(expanded.slice(3, 5), 16) / 255,
    parseInt(expanded.slice(5, 7), 16) / 255
  )
}

export function getPdfSavePickerOptions(name) {
  return {
    suggestedName: ensurePdfFileName(name),
    types: [{ description: 'PDF files', accept: { [PDF_MIME_TYPE]: ['.pdf'] } }],
  }
}

export async function applyPdfEditsToBytes(sourceBytes, annotations = []) {
  const pdfBytes = normalizePdfBytes(sourceBytes)
  if (annotations.length === 0) return pdfBytes

  const pdfDoc = await PDFDocument.load(pdfBytes)
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const pages = pdfDoc.getPages()

  for (const annotation of annotations) {
    const page = pages[(annotation?.pageNumber ?? 1) - 1]
    if (!page) continue

    const pageWidth = page.getWidth()
    const pageHeight = page.getHeight()
    const scale = Number(annotation?.scale) > 0 ? Number(annotation.scale) : 1

    if (annotation?.type === 'highlight') {
      const width = Math.max(Number(annotation.width) || 0, 8)
      const height = Math.max(Number(annotation.height) || 0, 8)
      const x = clampNumber((Number(annotation.x) || 0) / scale, 0, pageWidth)
      const y = clampNumber(
        pageHeight - ((Number(annotation.y) || 0) / scale) - (height / scale),
        0,
        pageHeight
      )
      page.drawRectangle({
        x,
        y,
        width: clampNumber(width / scale, 1, pageWidth),
        height: clampNumber(height / scale, 1, pageHeight),
        color: hexToRgb(annotation.color, rgb(1, 0.9216, 0.2314)),
        opacity: 0.35,
      })
      continue
    }

    if (annotation?.type === 'text' && typeof annotation.text === 'string' && annotation.text.trim()) {
      const fontSize = Math.max(Number(annotation.fontSize) || 14, 8)
      const x = clampNumber((Number(annotation.x) || 0) / scale, 0, pageWidth)
      const y = clampNumber(
        pageHeight - ((Number(annotation.y) || 0) / scale) - fontSize,
        0,
        pageHeight
      )
      page.drawText(annotation.text, {
        x,
        y,
        size: fontSize,
        font,
        color: hexToRgb(annotation.color, rgb(0.8275, 0.1843, 0.1843)),
      })
    }
  }

  return pdfDoc.save()
}
