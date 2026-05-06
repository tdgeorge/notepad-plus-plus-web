'use client'

import { useCallback, useRef, useState } from 'react'
import styles from './SplitPane.module.css'

export default function SplitPane({ left, right, ratio = 0.5, onRatioChange }) {
  const containerRef = useRef(null)
  const [dragging, setDragging] = useState(false)

  const handleMouseDown = useCallback(
    (e) => {
      e.preventDefault()
      setDragging(true)
      const container = containerRef.current
      if (!container) return

      const onMouseMove = (ev) => {
        const rect = container.getBoundingClientRect()
        const next = (ev.clientX - rect.left) / rect.width
        onRatioChange(Math.max(0.1, Math.min(0.9, next)))
      }

      const onMouseUp = () => {
        setDragging(false)
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)
      }

      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseup', onMouseUp)
    },
    [onRatioChange]
  )

  return (
    <div ref={containerRef} className={`${styles.container} ${dragging ? styles.dragging : ''}`}>
      <div className={styles.pane} style={{ flex: `${ratio} 1 0%` }}>
        {left}
      </div>
      <div
        className={styles.divider}
        onMouseDown={handleMouseDown}
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize panes"
      />
      <div className={styles.pane} style={{ flex: `${1 - ratio} 1 0%` }}>
        {right}
      </div>
    </div>
  )
}
