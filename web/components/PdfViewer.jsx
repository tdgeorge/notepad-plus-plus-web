'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { normalizePdfBytes } from '../lib/pdfTab.mjs'
import styles from './PdfViewer.module.css'

const PDF_SCALE = 1.25
const DEFAULT_TEXT = 'New note'
const DEFAULT_TEXT_COLOR = '#d32f2f'
const DEFAULT_HIGHLIGHT_COLOR = '#ffeb3b'

function annotationStyle(annotation) {
  return {
    left: annotation.x,
    top: annotation.y,
    width: annotation.width,
    height: annotation.height,
  }
}

export default function PdfViewer({ tab, onAnnotationsChange, onSave }) {
  const pdfBytes = useMemo(() => normalizePdfBytes(tab?.pdfBytes), [tab?.pdfBytes])
  const [pages, setPages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tool, setTool] = useState('pan')
  const [textValue, setTextValue] = useState(DEFAULT_TEXT)
  const [textColor, setTextColor] = useState(DEFAULT_TEXT_COLOR)
  const [highlightColor, setHighlightColor] = useState(DEFAULT_HIGHLIGHT_COLOR)
  const [draftHighlight, setDraftHighlight] = useState(null)
  const canvasRefs = useRef({})
  const pdfDocumentRef = useRef(null)
  const dragRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    let loadingTask = null

    async function loadDocument() {
      setLoading(true)
      setError('')
      setPages([])
      try {
        const pdfjs = await import('pdfjs-dist')
        if (!pdfjs.GlobalWorkerOptions.workerSrc) {
          pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()
        }
        if (cancelled) return
        loadingTask = pdfjs.getDocument({ data: pdfBytes })
        const pdfDocument = await loadingTask.promise
        if (cancelled) {
          pdfDocument.destroy()
          return
        }
        pdfDocumentRef.current = pdfDocument
        const nextPages = []
        for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
          const page = await pdfDocument.getPage(pageNumber)
          const viewport = page.getViewport({ scale: PDF_SCALE })
          nextPages.push({
            pageNumber,
            width: viewport.width,
            height: viewport.height,
            scale: PDF_SCALE,
          })
        }
        if (!cancelled) {
          setPages(nextPages)
          setLoading(false)
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError?.message || 'Failed to load PDF')
          setLoading(false)
        }
      }
    }

    loadDocument()

    return () => {
      cancelled = true
      dragRef.current = null
      if (loadingTask?.destroy) loadingTask.destroy()
      pdfDocumentRef.current?.destroy?.()
      pdfDocumentRef.current = null
    }
  }, [pdfBytes])

  useEffect(() => {
    let cancelled = false

    async function renderPages() {
      const pdfDocument = pdfDocumentRef.current
      if (!pdfDocument || pages.length === 0) return
      for (const pageMeta of pages) {
        if (cancelled) break
        const canvas = canvasRefs.current[pageMeta.pageNumber]
        if (!canvas) continue
        const page = await pdfDocument.getPage(pageMeta.pageNumber)
        const viewport = page.getViewport({ scale: pageMeta.scale })
        const context = canvas.getContext('2d')
        canvas.width = viewport.width
        canvas.height = viewport.height
        canvas.style.width = `${viewport.width}px`
        canvas.style.height = `${viewport.height}px`
        await page.render({ canvasContext: context, viewport }).promise
      }
    }

    renderPages()
    return () => {
      cancelled = true
    }
  }, [pages])

  const pageAnnotations = useMemo(() => {
    const map = new Map()
    for (const annotation of tab?.pdfAnnotations ?? []) {
      const pageNumber = annotation?.pageNumber ?? 1
      const current = map.get(pageNumber)
      if (current) current.push(annotation)
      else map.set(pageNumber, [annotation])
    }
    return map
  }, [tab?.pdfAnnotations])

  const commitAnnotations = useCallback((nextAnnotations) => {
    onAnnotationsChange(nextAnnotations)
  }, [onAnnotationsChange])

  const handleTextClick = useCallback((pageMeta, event) => {
    if (tool !== 'text' || !textValue.trim()) return
    const rect = event.currentTarget.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    commitAnnotations([
      ...(tab?.pdfAnnotations ?? []),
      {
        id: `${pageMeta.pageNumber}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        type: 'text',
        pageNumber: pageMeta.pageNumber,
        x,
        y,
        width: 0,
        height: 0,
        scale: pageMeta.scale,
        color: textColor,
        fontSize: 14,
        text: textValue.trim(),
      },
    ])
  }, [commitAnnotations, tab?.pdfAnnotations, textColor, textValue, tool])

  const handleHighlightMouseDown = useCallback((pageMeta, event) => {
    if (tool !== 'highlight') return
    const rect = event.currentTarget.getBoundingClientRect()
    dragRef.current = {
      pageNumber: pageMeta.pageNumber,
      scale: pageMeta.scale,
      startX: event.clientX - rect.left,
      startY: event.clientY - rect.top,
    }
    setDraftHighlight({
      pageNumber: pageMeta.pageNumber,
      x: dragRef.current.startX,
      y: dragRef.current.startY,
      width: 0,
      height: 0,
      color: highlightColor,
    })
  }, [highlightColor, tool])

  const handleHighlightMouseMove = useCallback((event) => {
    const drag = dragRef.current
    if (!drag) return
    const rect = event.currentTarget.getBoundingClientRect()
    const currentX = event.clientX - rect.left
    const currentY = event.clientY - rect.top
    const x = Math.min(drag.startX, currentX)
    const y = Math.min(drag.startY, currentY)
    setDraftHighlight({
      pageNumber: drag.pageNumber,
      x,
      y,
      width: Math.abs(currentX - drag.startX),
      height: Math.abs(currentY - drag.startY),
      color: highlightColor,
    })
  }, [highlightColor])

  const handleHighlightMouseUp = useCallback(() => {
    const drag = dragRef.current
    if (!drag || !draftHighlight) return
    const width = draftHighlight.width > 8 ? draftHighlight.width : 120
    const height = draftHighlight.height > 8 ? draftHighlight.height : 18
    commitAnnotations([
      ...(tab?.pdfAnnotations ?? []),
      {
        id: `${drag.pageNumber}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        type: 'highlight',
        pageNumber: drag.pageNumber,
        x: draftHighlight.x,
        y: draftHighlight.y,
        width,
        height,
        scale: drag.scale,
        color: highlightColor,
      },
    ])
    dragRef.current = null
    setDraftHighlight(null)
  }, [commitAnnotations, draftHighlight, highlightColor, tab?.pdfAnnotations])

  const handleUndo = useCallback(() => {
    if ((tab?.pdfAnnotations?.length ?? 0) === 0) return
    commitAnnotations(tab.pdfAnnotations.slice(0, -1))
  }, [commitAnnotations, tab?.pdfAnnotations])

  const handleClear = useCallback(() => {
    if ((tab?.pdfAnnotations?.length ?? 0) === 0) return
    commitAnnotations([])
  }, [commitAnnotations, tab?.pdfAnnotations])

  if (loading) {
    return <div className={styles.status}>Loading PDF…</div>
  }

  if (error) {
    return <div className={styles.status}>{error}</div>
  }

  return (
    <div className={styles.viewer}>
      <div className={styles.toolbar}>
        <div className={styles.toolbarGroup}>
          <button
            className={`${styles.toolbarButton}${tool === 'pan' ? ` ${styles.toolbarButtonActive}` : ''}`}
            type="button"
            onClick={() => setTool('pan')}
          >
            Pan
          </button>
          <button
            className={`${styles.toolbarButton}${tool === 'text' ? ` ${styles.toolbarButtonActive}` : ''}`}
            type="button"
            onClick={() => setTool('text')}
          >
            Add Text
          </button>
          <button
            className={`${styles.toolbarButton}${tool === 'highlight' ? ` ${styles.toolbarButtonActive}` : ''}`}
            type="button"
            onClick={() => setTool('highlight')}
          >
            Highlight
          </button>
        </div>
        {tool === 'text' ? (
          <div className={styles.toolbarGroup}>
            <input
              className={styles.toolbarInput}
              type="text"
              value={textValue}
              onChange={(event) => setTextValue(event.target.value)}
              aria-label="PDF text annotation"
            />
            <input
              className={styles.toolbarColorInput}
              type="color"
              value={textColor}
              onChange={(event) => setTextColor(event.target.value)}
              aria-label="PDF text color"
            />
          </div>
        ) : (
          <div className={styles.toolbarGroup}>
            <label className={styles.toolbarLabel} htmlFor={`pdf-highlight-${tab?.id}`}>Highlight</label>
            <input
              id={`pdf-highlight-${tab?.id}`}
              className={styles.toolbarColorInput}
              type="color"
              value={highlightColor}
              onChange={(event) => setHighlightColor(event.target.value)}
              aria-label="PDF highlight color"
            />
          </div>
        )}
        <div className={styles.toolbarGroup}>
          <button
            className={styles.toolbarButton}
            type="button"
            onClick={handleUndo}
            disabled={(tab?.pdfAnnotations?.length ?? 0) === 0}
          >
            Undo
          </button>
          <button
            className={styles.toolbarButton}
            type="button"
            onClick={handleClear}
            disabled={(tab?.pdfAnnotations?.length ?? 0) === 0}
          >
            Clear
          </button>
          <button
            className={styles.toolbarButton}
            type="button"
            onClick={onSave}
          >
            Save PDF
          </button>
        </div>
      </div>
      <div className={styles.pages}>
        {pages.map((pageMeta) => (
          <div
            key={pageMeta.pageNumber}
            className={styles.page}
            style={{ width: pageMeta.width, height: pageMeta.height }}
          >
            <canvas
              ref={(node) => {
                if (node) canvasRefs.current[pageMeta.pageNumber] = node
                else delete canvasRefs.current[pageMeta.pageNumber]
              }}
              className={styles.canvas}
            />
            <div
              className={`${styles.overlay}${tool === 'pan' ? ` ${styles.overlayPan}` : ''}`}
              onClick={(event) => handleTextClick(pageMeta, event)}
              onMouseDown={(event) => handleHighlightMouseDown(pageMeta, event)}
              onMouseMove={handleHighlightMouseMove}
              onMouseUp={handleHighlightMouseUp}
              onMouseLeave={handleHighlightMouseUp}
            >
              {(pageAnnotations.get(pageMeta.pageNumber) ?? []).map((annotation) => (
                annotation.type === 'highlight' ? (
                  <div
                    key={annotation.id}
                    className={styles.annotationHighlight}
                    style={{
                      ...annotationStyle(annotation),
                      background: annotation.color,
                      opacity: 0.35,
                    }}
                  />
                ) : (
                  <div
                    key={annotation.id}
                    className={styles.annotationText}
                    style={{
                      left: annotation.x,
                      top: annotation.y,
                      color: annotation.color,
                    }}
                  >
                    {annotation.text}
                  </div>
                )
              ))}
              {draftHighlight?.pageNumber === pageMeta.pageNumber && (
                <div
                  className={styles.annotationDraft}
                  style={{
                    ...annotationStyle(draftHighlight),
                    background: draftHighlight.color,
                    opacity: 0.3,
                  }}
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
