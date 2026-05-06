'use client'

import { useState, useEffect } from 'react'
import styles from './ToolsRandomDialog.module.css'

function generateUUID() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  // Fallback
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export default function ToolsRandomDialog({ isOpen, onClose }) {
  const [value, setValue] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setValue(generateUUID())
      setCopied(false)
    }
  }, [isOpen])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  const handleGenerate = () => {
    setValue(generateUUID())
    setCopied(false)
  }

  const handleCopy = () => {
    if (!value) return
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  if (!isOpen) return null

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.dialog} role="dialog" aria-modal="true" aria-label="Generate Random Number">
        <div className={styles.titleBar}>
          <span>Generate Random Number</span>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className={styles.body}>
          <label className={styles.label} htmlFor="random-result">Random UUID:</label>
          <div className={styles.resultRow}>
            <input
              id="random-result"
              className={styles.resultInput}
              type="text"
              readOnly
              value={value}
            />
            <button
              className={`${styles.actionBtn} ${copied ? styles.copied : ''}`}
              onClick={handleCopy}
              disabled={!value}
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
        <div className={styles.buttons}>
          <button className={styles.btn} onClick={handleGenerate}>Generate</button>
          <button className={styles.btn} onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
