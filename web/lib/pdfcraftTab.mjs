export const PDFCRAFT_URL = '/pdfcraft/index.html'

export function createPdfcraftTab(id) {
  if (!Number.isFinite(id)) return null
  return {
    id,
    name: 'PdfCraft',
    content: '',
    modified: false,
    renderMode: 'pdfcraft',
  }
}
