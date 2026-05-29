'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { normalizePdfBytes } from '../lib/pdfTab.mjs'
import styles from './PdfViewer.module.css'

const PDF_SCALE = 1.25
const DEFAULT_TEXT_COLOR = '#d32f2f'
const DEFAULT_HIGHLIGHT_COLOR = '#ffeb3b'
const TEXT_FONT_SIZE = 14
const DRAFT_TEXT_ID = '__draft_text__'

function annotationStyle(annotation, positionOverride = null) {
  const position = positionOverride ?? annotation
  return {
    left: position.x,
    top: position.y,
    width: annotation.width,
    height: annotation.height,
  }
}

function createAnnotationId(pageNumber) {
  return `${pageNumber}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function normalizeAnnotationText(value) {
  return typeof value === 'string' ? value.replace(/\r\n?/g, '\n') : ''
}

function getPointerPosition(event) {
  const rect = event.currentTarget.getBoundingClientRect()
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  }
}

export default function PdfViewer({ tab, onAnnotationsChange, onSave }) {
  const pdfBytes = useMemo(() => normalizePdfBytes(tab?.pdfBytes), [tab?.pdfBytes])
  const [pages, setPages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tool, setTool] = useState('pan')
  const [textColor, setTextColor] = useState(DEFAULT_TEXT_COLOR)
  const [highlightColor, setHighlightColor] = useState(DEFAULT_HIGHLIGHT_COLOR)
  const [draftHighlight, setDraftHighlight] = useState(null)
  const [draftText, setDraftText] = useState(null)
  const [editingAnnotationId, setEditingAnnotationId] = useState(null)
  const [editingTextValue, setEditingTextValue] = useState('')
  const [selectedAnnotationId, setSelectedAnnotationId] = useState(null)
  const [dragPreview, setDragPreview] = useState(null)
  const canvasRefs = useRef({})
  const pdfDocumentRef = useRef(null)
  const interactionRef = useRef(null)
  const suppressClickRef = useRef(null)
  const textEditorRef = useRef(null)

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
      interactionRef.current = null
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

  useEffect(() => {
    if (!textEditorRef.current) return
    textEditorRef.current.focus()
    const valueLength = textEditorRef.current.value.length
    textEditorRef.current.setSelectionRange(valueLength, valueLength)
  }, [editingAnnotationId])

  useEffect(() => {
    if (tool === 'text') return
    setDraftText(null)
    setEditingAnnotationId(null)
    setEditingTextValue('')
  }, [tool])

  useEffect(() => {
    const annotationIds = new Set((tab?.pdfAnnotations ?? []).map((annotation) => annotation.id))
    if (selectedAnnotationId && !annotationIds.has(selectedAnnotationId)) {
      setSelectedAnnotationId(null)
    }
    if (editingAnnotationId && editingAnnotationId !== DRAFT_TEXT_ID && !annotationIds.has(editingAnnotationId)) {
      setEditingAnnotationId(null)
      setEditingTextValue('')
    }
  }, [editingAnnotationId, selectedAnnotationId, tab?.pdfAnnotations])

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

  const handleTextColorChange = useCallback((event) => {
    const nextColor = event.target.value
    setTextColor(nextColor)
    if (editingAnnotationId && editingAnnotationId !== DRAFT_TEXT_ID) {
      commitAnnotations(
        (tab?.pdfAnnotations ?? []).map((annotation) => (
          annotation.id === editingAnnotationId
            ? { ...annotation, color: nextColor }
            : annotation
        ))
      )
    }
    if (draftText) {
      setDraftText((currentDraft) => (currentDraft ? { ...currentDraft, color: nextColor } : currentDraft))
    }
  }, [commitAnnotations, draftText, editingAnnotationId, tab?.pdfAnnotations])

  const closeTextEditor = useCallback(() => {
    setDraftText(null)
    setEditingAnnotationId(null)
    setEditingTextValue('')
  }, [])

  const handleCommitTextEditor = useCallback(() => {
    const normalizedText = normalizeAnnotationText(editingTextValue)

    if (editingAnnotationId === DRAFT_TEXT_ID) {
      if (!draftText || !normalizedText.trim()) {
        closeTextEditor()
        return
      }

      const nextAnnotation = {
        ...draftText,
        id: createAnnotationId(draftText.pageNumber),
        text: normalizedText,
      }
      commitAnnotations([...(tab?.pdfAnnotations ?? []), nextAnnotation])
      setSelectedAnnotationId(nextAnnotation.id)
      closeTextEditor()
      return
    }

    if (!editingAnnotationId) return

    if (!normalizedText.trim()) {
      commitAnnotations((tab?.pdfAnnotations ?? []).filter((annotation) => annotation.id !== editingAnnotationId))
      setSelectedAnnotationId(null)
      closeTextEditor()
      return
    }

    commitAnnotations(
      (tab?.pdfAnnotations ?? []).map((annotation) => (
        annotation.id === editingAnnotationId
          ? { ...annotation, text: normalizedText }
          : annotation
      ))
    )
    setSelectedAnnotationId(editingAnnotationId)
    closeTextEditor()
  }, [closeTextEditor, commitAnnotations, draftText, editingAnnotationId, editingTextValue, tab?.pdfAnnotations])

  const handleCancelTextEditor = useCallback(() => {
    closeTextEditor()
  }, [closeTextEditor])

  const handleTextEditorKeyDown = useCallback((event) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      handleCancelTextEditor()
      return
    }
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault()
      handleCommitTextEditor()
    }
  }, [handleCancelTextEditor, handleCommitTextEditor])

  const handleOverlayClick = useCallback((pageMeta, event) => {
    if (tool !== 'text' || event.target !== event.currentTarget) return
    const { x, y } = getPointerPosition(event)
    setDraftText({
      pageNumber: pageMeta.pageNumber,
      x,
      y,
      width: 0,
      height: 0,
      scale: pageMeta.scale,
      color: textColor,
      fontSize: TEXT_FONT_SIZE,
    })
    setEditingAnnotationId(DRAFT_TEXT_ID)
    setEditingTextValue('')
    setSelectedAnnotationId(null)
  }, [textColor, tool])

  const handleOverlayPointerDown = useCallback((pageMeta, event) => {
    if (tool !== 'highlight' || event.target !== event.currentTarget) return
    if (event.button !== undefined && event.button !== 0) return
    event.preventDefault()
    event.currentTarget.setPointerCapture?.(event.pointerId)
    const { x, y } = getPointerPosition(event)
    interactionRef.current = {
      type: 'highlight',
      pointerId: event.pointerId,
      pageNumber: pageMeta.pageNumber,
      scale: pageMeta.scale,
      startX: x,
      startY: y,
    }
    setDraftHighlight({
      pageNumber: pageMeta.pageNumber,
      x,
      y,
      width: 0,
      height: 0,
      color: highlightColor,
    })
  }, [highlightColor, tool])

  const handleTextAnnotationPointerDown = useCallback((annotation, event) => {
    if (annotation.type !== 'text' || editingAnnotationId === annotation.id) return
    if (event.button !== undefined && event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.parentElement?.setPointerCapture?.(event.pointerId)
    interactionRef.current = {
      type: 'move-text',
      pointerId: event.pointerId,
      pageNumber: annotation.pageNumber,
      annotationId: annotation.id,
      originX: annotation.x,
      originY: annotation.y,
      startClientX: event.clientX,
      startClientY: event.clientY,
      moved: false,
    }
    setDragPreview({ id: annotation.id, x: annotation.x, y: annotation.y })
    setSelectedAnnotationId(annotation.id)
  }, [editingAnnotationId])

  const handleOverlayPointerMove = useCallback((pageMeta, event) => {
    const interaction = interactionRef.current
    if (!interaction || interaction.pointerId !== event.pointerId || interaction.pageNumber !== pageMeta.pageNumber) return

    if (interaction.type === 'highlight') {
      const { x: currentX, y: currentY } = getPointerPosition(event)
      const x = Math.min(interaction.startX, currentX)
      const y = Math.min(interaction.startY, currentY)
      setDraftHighlight({
        pageNumber: interaction.pageNumber,
        x,
        y,
        width: Math.abs(currentX - interaction.startX),
        height: Math.abs(currentY - interaction.startY),
        color: highlightColor,
      })
      return
    }

    if (interaction.type === 'move-text') {
      const nextX = Math.max(0, interaction.originX + (event.clientX - interaction.startClientX))
      const nextY = Math.max(0, interaction.originY + (event.clientY - interaction.startClientY))
      interaction.moved = interaction.moved || Math.abs(event.clientX - interaction.startClientX) > 2 || Math.abs(event.clientY - interaction.startClientY) > 2
      setDragPreview({ id: interaction.annotationId, x: nextX, y: nextY })
    }
  }, [highlightColor])

  const handleOverlayPointerUp = useCallback((pageMeta, event) => {
    const interaction = interactionRef.current
    if (!interaction || interaction.pointerId !== event.pointerId || interaction.pageNumber !== pageMeta.pageNumber) return
    event.currentTarget.releasePointerCapture?.(event.pointerId)

    if (interaction.type === 'highlight' && draftHighlight) {
      const width = draftHighlight.width > 8 ? draftHighlight.width : 120
      const height = draftHighlight.height > 8 ? draftHighlight.height : 18
      commitAnnotations([
        ...(tab?.pdfAnnotations ?? []),
        {
          id: createAnnotationId(interaction.pageNumber),
          type: 'highlight',
          pageNumber: interaction.pageNumber,
          x: draftHighlight.x,
          y: draftHighlight.y,
          width,
          height,
          scale: interaction.scale,
          color: highlightColor,
        },
      ])
      setDraftHighlight(null)
      interactionRef.current = null
      return
    }

    if (interaction.type === 'move-text') {
      if (interaction.moved && dragPreview) {
        commitAnnotations(
          (tab?.pdfAnnotations ?? []).map((annotation) => (
            annotation.id === interaction.annotationId
              ? { ...annotation, x: dragPreview.x, y: dragPreview.y }
              : annotation
          ))
        )
        suppressClickRef.current = interaction.annotationId
      }
      setDragPreview(null)
      interactionRef.current = null
    }
  }, [commitAnnotations, dragPreview, draftHighlight, highlightColor, tab?.pdfAnnotations])

  const handleOverlayPointerCancel = useCallback((event) => {
    const interaction = interactionRef.current
    if (!interaction || interaction.pointerId !== event.pointerId) return
    event.currentTarget.releasePointerCapture?.(event.pointerId)
    interactionRef.current = null
    setDraftHighlight(null)
    setDragPreview(null)
  }, [])

  const handleTextAnnotationClick = useCallback((annotation, event) => {
    event.stopPropagation()
    if (suppressClickRef.current === annotation.id) {
      suppressClickRef.current = null
      return
    }
    setSelectedAnnotationId(annotation.id)
    if (annotation.type !== 'text' || tool !== 'text') return
    setDraftText(null)
    setEditingAnnotationId(annotation.id)
    setEditingTextValue(normalizeAnnotationText(annotation.text))
    setTextColor(annotation.color || DEFAULT_TEXT_COLOR)
  }, [tool])

  const handleUndo = useCallback(() => {
    if ((tab?.pdfAnnotations?.length ?? 0) === 0) return
    closeTextEditor()
    commitAnnotations(tab.pdfAnnotations.slice(0, -1))
  }, [closeTextEditor, commitAnnotations, tab?.pdfAnnotations])

  const handleClear = useCallback(() => {
    if ((tab?.pdfAnnotations?.length ?? 0) === 0) return
    closeTextEditor()
    setSelectedAnnotationId(null)
    commitAnnotations([])
  }, [closeTextEditor, commitAnnotations, tab?.pdfAnnotations])

  if (loading) {
    return <div className={styles.status}>Loading PDF…</div>
  }

  if (error) {
    return <div className={styles.status}>{error}</div>
  }

  const annotationCount = tab?.pdfAnnotations?.length ?? 0

  return (
    <div className={styles.viewer}>
      <div className={styles.toolbar}>
        <div className={styles.toolbarRow}>
          <div className={`${styles.toolbarGroup} ${styles.segmentedGroup}`}>
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
              Text
            </button>
            <button
              className={`${styles.toolbarButton}${tool === 'highlight' ? ` ${styles.toolbarButtonActive}` : ''}`}
              type="button"
              onClick={() => setTool('highlight')}
            >
              Highlight
            </button>
          </div>
          <div className={styles.toolbarBadge}>
            {annotationCount} {annotationCount === 1 ? 'annotation' : 'annotations'}
          </div>
        </div>
        <div className={styles.toolbarRow}>
          <div className={`${styles.toolbarGroup} ${styles.toolbarContext}`}>
            <span className={styles.toolbarHint}>
              {tool === 'text'
                ? 'Tap to place a label, type directly on the page, then drag it where you want it.'
                : tool === 'highlight'
                  ? 'Drag across the page to mark a highlight.'
                  : 'Scroll, zoom, and review the PDF normally.'}
            </span>
            <label className={styles.toolbarLabel} htmlFor={`pdf-color-${tab?.id}`}>
              {tool === 'highlight' ? 'Highlight' : 'Text'} color
            </label>
            <input
              id={`pdf-color-${tab?.id}`}
              className={styles.toolbarColorInput}
              type="color"
              value={tool === 'highlight' ? highlightColor : textColor}
              onChange={tool === 'highlight' ? (event) => setHighlightColor(event.target.value) : handleTextColorChange}
              aria-label={tool === 'highlight' ? 'PDF highlight color' : 'PDF text color'}
            />
          </div>
          <div className={`${styles.toolbarGroup} ${styles.toolbarActions}`}>
            <button
              className={styles.toolbarButton}
              type="button"
              onClick={handleUndo}
              disabled={annotationCount === 0}
            >
              Undo
            </button>
            <button
              className={styles.toolbarButton}
              type="button"
              onClick={handleClear}
              disabled={annotationCount === 0}
            >
              Clear
            </button>
            <button
              className={`${styles.toolbarButton} ${styles.toolbarButtonPrimary}`}
              type="button"
              onClick={onSave}
            >
              Save PDF
            </button>
          </div>
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
              className={`${styles.overlay}${tool === 'pan' ? ` ${styles.overlayPan}` : ` ${styles.overlayDraw}`}`}
              onClick={(event) => handleOverlayClick(pageMeta, event)}
              onPointerDown={(event) => handleOverlayPointerDown(pageMeta, event)}
              onPointerMove={(event) => handleOverlayPointerMove(pageMeta, event)}
              onPointerUp={(event) => handleOverlayPointerUp(pageMeta, event)}
              onPointerCancel={handleOverlayPointerCancel}
            >
              {(pageAnnotations.get(pageMeta.pageNumber) ?? []).map((annotation) => {
                const previewPosition = dragPreview?.id === annotation.id ? dragPreview : null
                const isEditing = editingAnnotationId === annotation.id
                const isSelected = selectedAnnotationId === annotation.id

                if (annotation.type === 'highlight') {
                  return (
                    <div
                      key={annotation.id}
                      className={styles.annotationHighlight}
                      style={{
                        ...annotationStyle(annotation, previewPosition),
                        background: annotation.color,
                        opacity: 0.35,
                      }}
                    />
                  )
                }

                if (isEditing) {
                  return (
                    <textarea
                      key={annotation.id}
                      ref={textEditorRef}
                      className={`${styles.annotationEditor} ${styles.annotationText} ${styles.annotationTextSelected}`}
                      style={{
                        left: previewPosition?.x ?? annotation.x,
                        top: previewPosition?.y ?? annotation.y,
                        color: annotation.color,
                      }}
                      value={editingTextValue}
                      onChange={(event) => setEditingTextValue(event.target.value)}
                      onBlur={handleCommitTextEditor}
                      onKeyDown={handleTextEditorKeyDown}
                      onPointerDown={(event) => event.stopPropagation()}
                      aria-label="PDF text annotation"
                    />
                  )
                }

                return (
                  <div
                    key={annotation.id}
                    className={`${styles.annotationText}${isSelected ? ` ${styles.annotationTextSelected}` : ''}`}
                    role="button"
                    tabIndex={0}
                    style={{
                      left: previewPosition?.x ?? annotation.x,
                      top: previewPosition?.y ?? annotation.y,
                      color: annotation.color,
                    }}
                    onClick={(event) => handleTextAnnotationClick(annotation, event)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        handleTextAnnotationClick(annotation, event)
                      }
                    }}
                    onPointerDown={(event) => handleTextAnnotationPointerDown(annotation, event)}
                  >
                    {annotation.text}
                  </div>
                )
              })}
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
              {draftText?.pageNumber === pageMeta.pageNumber && editingAnnotationId === DRAFT_TEXT_ID && (
                <textarea
                  ref={textEditorRef}
                  className={`${styles.annotationEditor} ${styles.annotationText} ${styles.annotationTextSelected}`}
                  style={{
                    left: draftText.x,
                    top: draftText.y,
                    color: draftText.color,
                  }}
                  value={editingTextValue}
                  onChange={(event) => setEditingTextValue(event.target.value)}
                  onBlur={handleCommitTextEditor}
                  onKeyDown={handleTextEditorKeyDown}
                  onPointerDown={(event) => event.stopPropagation()}
                  placeholder="Type text…"
                  aria-label="PDF text annotation"
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
