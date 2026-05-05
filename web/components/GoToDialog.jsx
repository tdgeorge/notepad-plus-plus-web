'use client'

import { useState, useEffect, useRef } from 'react'
import styles from './GoToDialog.module.css'

export default function GoToDialog({ isOpen, lineCount, onClose, onGoTo }) {
  const [lineNum, setLineNum] = useState('')
  const [error, setError] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      setLineNum('')
      setError('')
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleSubmit = () => {
    const n = parseInt(lineNum, 10)
    if (isNaN(n) || n < 1) {
      setError('Please enter a valid line number.')
      return
    }
    if (lineCount && n > lineCount) {
      setError(`Line number must be between 1 and ${lineCount}.`)
      return
    }
    onGoTo(n)
    onClose()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSubmit()
    if (e.key === 'Escape') onClose()
  }

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.dialog} role="dialog" aria-label="Go to Line">
        <div className={styles.titleBar}>
          <span>Go to Line</span>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className={styles.body}>
          <label className={styles.label}>
            Line number (1 – {lineCount || '?'}):
          </label>
          <input
            ref={inputRef}
            className={styles.input}
            type="number"
            min="1"
            max={lineCount}
            value={lineNum}
            onChange={(e) => { setLineNum(e.target.value); setError('') }}
            onKeyDown={handleKeyDown}
          />
          {error && <div className={styles.error}>{error}</div>}
        </div>
        <div className={styles.buttons}>
          <button className={styles.btn} onClick={handleSubmit}>Go</button>
          <button className={styles.btn} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}
