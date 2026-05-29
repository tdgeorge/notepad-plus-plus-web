export const PDF_MIME_TYPE = 'application/pdf'

export function ensurePdfFileName(name, fallback = 'document.pdf') {
  const trimmed = typeof name === 'string' ? name.trim() : ''
  if (!trimmed) return fallback
  return /\.pdf$/i.test(trimmed) ? trimmed : `${trimmed}.pdf`
}

export function isPdfFileName(name) {
  return /\.pdf$/i.test(typeof name === 'string' ? name.trim() : '')
}

export function isPdfFile(file) {
  if (!file) return false
  const fileType = typeof file.type === 'string' ? file.type.toLowerCase() : ''
  return fileType === PDF_MIME_TYPE || isPdfFileName(file.name)
}

export function normalizePdfBytes(bytes) {
  if (bytes instanceof Uint8Array) return bytes
  return new Uint8Array(bytes ?? new ArrayBuffer(0))
}

export function createPdfTab({ id, name, bytes, pinned = false, pinOrder = null }) {
  if (!Number.isFinite(id)) return null
  const pdfBytes = normalizePdfBytes(bytes)
  if (pdfBytes.length === 0) return null
  return {
    id,
    name: ensurePdfFileName(name, `Untitled ${id}.pdf`),
    content: '',
    modified: false,
    language: null,
    pinned,
    pinOrder,
    renderMode: 'pdf',
    pdfBytes,
    pdfAnnotations: [],
  }
}

export async function createOpenTabFromFile(file, id, detectLanguage = () => null) {
  if (isPdfFile(file)) {
    const bytes = await file.arrayBuffer()
    return createPdfTab({ id, name: file.name, bytes })
  }

  const content = await file.text()
  return {
    id,
    name: file.name,
    content,
    modified: false,
    language: detectLanguage(file.name),
    pinned: false,
    pinOrder: null,
  }
}
