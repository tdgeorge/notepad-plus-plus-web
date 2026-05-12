'use client'

import { useRef, useEffect, useCallback } from 'react'
import styles from './DocumentMapPanel.module.css'

// Width of the map canvas in CSS pixels
const MAP_WIDTH = 120
// Number of horizontal pixels used to render each text character (fractional px)
const CHAR_PX = 1.5
// Vertical pixels per document line in the map
const LINE_PX = 2

/**
 * DocumentMapPanel renders a canvas mini-map of the document content and
 * overlays a translucent viewport indicator.  Clicking or dragging the map
 * scrolls the editor to the corresponding position.
 *
 * Props:
 *   content       {string}   Full text of the active document
 *   scrollTop     {number}   Current textarea scrollTop (px)
 *   scrollHeight  {number}   Total textarea scrollHeight (px)
 *   clientHeight  {number}   Visible textarea clientHeight (px)
 *   onNavigate    {function} Called with new scrollTop when user clicks/drags
 *   onClose       {function} Called when the close button is clicked
 */
export default function DocumentMapPanel({ content, scrollTop, scrollHeight, clientHeight, onNavigate, onClose }) {
  const canvasRef = useRef(null)
  const isDraggingRef = useRef(false)

  // ── Map rendering ──────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const lines = content.split('\n')
    const totalLines = lines.length
    const mapHeight = Math.max(1, totalLines * LINE_PX)

    // Use device pixel ratio for crisp rendering
    const dpr = window.devicePixelRatio || 1
    canvas.width = MAP_WIDTH * dpr
    canvas.height = mapHeight * dpr
    canvas.style.width = `${MAP_WIDTH}px`
    canvas.style.height = `${mapHeight}px`

    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)

    // Background
    const bg = getComputedStyle(document.documentElement).getPropertyValue('--editor-bg').trim() || '#ffffff'
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, MAP_WIDTH, mapHeight)

    // Text colour
    const fg = getComputedStyle(document.documentElement).getPropertyValue('--editor-fg').trim() || '#000000'
    ctx.fillStyle = fg

    // Draw each line as a short horizontal bar proportional to line length
    for (let i = 0; i < totalLines; i++) {
      const lineLen = lines[i].length
      if (lineLen === 0) continue
      const barWidth = Math.min(MAP_WIDTH, lineLen * CHAR_PX)
      const y = i * LINE_PX
      ctx.fillRect(0, y, barWidth, Math.max(1, LINE_PX - 0.5))
    }
  }, [content])

  // ── Viewport overlay ───────────────────────────────────────────────────────
  // Compute the position and height of the viewport zone relative to the canvas
  const totalLines = content.split('\n').length
  const mapHeight = Math.max(1, totalLines * LINE_PX)
  const safeScrollHeight = scrollHeight > 0 ? scrollHeight : 1
  const safeClientHeight = clientHeight > 0 ? clientHeight : 1

  // Where the visible viewport starts in the map (px)
  const viewportTop = (scrollTop / safeScrollHeight) * mapHeight
  // How tall the visible viewport is in the map (px)
  const viewportHeight = Math.min(mapHeight, (safeClientHeight / safeScrollHeight) * mapHeight)

  // ── Navigation ─────────────────────────────────────────────────────────────
  const navigateToY = useCallback((clientY) => {
    const canvas = canvasRef.current
    if (!canvas || !onNavigate) return
    const rect = canvas.getBoundingClientRect()
    const y = clientY - rect.top
    const ratio = Math.max(0, Math.min(1, y / rect.height))
    // Centre the viewport on the clicked position
    const targetScrollTop = ratio * safeScrollHeight - safeClientHeight / 2
    onNavigate(Math.max(0, targetScrollTop))
  }, [onNavigate, safeScrollHeight, safeClientHeight])

  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return
    isDraggingRef.current = true
    navigateToY(e.clientY)
    e.preventDefault()
  }, [navigateToY])

  const handleMouseMove = useCallback((e) => {
    if (!isDraggingRef.current) return
    navigateToY(e.clientY)
  }, [navigateToY])

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false
  }, [])

  useEffect(() => {
    const onUp = () => { isDraggingRef.current = false }
    window.addEventListener('mouseup', onUp)
    return () => window.removeEventListener('mouseup', onUp)
  }, [])

  // Touch support for mobile
  const handleTouchStart = useCallback((e) => {
    isDraggingRef.current = true
    navigateToY(e.touches[0].clientY)
    e.preventDefault()
  }, [navigateToY])

  const handleTouchMove = useCallback((e) => {
    if (!isDraggingRef.current) return
    navigateToY(e.touches[0].clientY)
    e.preventDefault()
  }, [navigateToY])

  const handleTouchEnd = useCallback(() => {
    isDraggingRef.current = false
  }, [])

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.title}>Document Map</span>
        <button
          className={styles.closeBtn}
          onClick={onClose}
          aria-label="Close Document Map"
          title="Close"
        >
          ×
        </button>
      </div>
      <div className={styles.mapContainer}>
        <canvas
          ref={canvasRef}
          className={styles.canvas}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          aria-label="Document map - click or drag to navigate"
        />
        {/* Viewport indicator overlay */}
        <div
          className={styles.viewport}
          style={{
            top: `${viewportTop}px`,
            height: `${Math.max(4, viewportHeight)}px`,
          }}
          aria-hidden="true"
        />
      </div>
    </div>
  )
}
