export const PDFCRAFT_URL = '/pdfcraft/index.html'
export const PDFCRAFT_IFRAME_SANDBOX = 'allow-scripts allow-same-origin allow-downloads allow-modals allow-popups'

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
