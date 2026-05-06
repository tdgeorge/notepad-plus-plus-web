'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { md5 } from '../lib/md5'
import styles from './ToolsHashDialog.module.css'

async function sha256(input) {
  const enc = new TextEncoder()
  const data = enc.encode(input)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

export default function ToolsHashDialog({ isOpen, algorithm, initialText, onClose }) {
  const [inputText, setInputText] = useState('')
  const [hashResult, setHashResult] = useState('')
  const [copied, setCopied] = useState(false)
  const inputRef = useRef(null)

  const computeHash = useCallback(async (text) => {
    if (!text) {
      setHashResult('')
      return
    }
    if (algorithm === 'MD5') {
      setHashResult(md5(text))
    } else {
      setHashResult(await sha256(text))
    }
  }, [algorithm])

  useEffect(() => {
    if (isOpen) {
      const text = initialText ?? ''
      setInputText(text)
      setCopied(false)
      computeHash(text)
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [isOpen, initialText, computeHash])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  const handleInputChange = (e) => {
    const text = e.target.value
    setInputText(text)
    setCopied(false)
    computeHash(text)
  }

  const handleCopy = () => {
    if (!hashResult) return
    navigator.clipboard.writeText(hashResult).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  if (!isOpen) return null

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.dialog} role="dialog" aria-modal="true" aria-label={`${algorithm} - Generate`}>
        <div className={styles.titleBar}>
          <span>{algorithm} - Generate</span>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className={styles.body}>
          <label className={styles.label} htmlFor="hash-input">Input text:</label>
          <textarea
            id="hash-input"
            ref={inputRef}
            className={styles.textarea}
            value={inputText}
            onChange={handleInputChange}
            rows={4}
            spellCheck={false}
          />
          <label className={styles.label} htmlFor="hash-result">{algorithm} hash:</label>
          <div className={styles.resultRow}>
            <input
              id="hash-result"
              className={styles.resultInput}
              type="text"
              readOnly
              value={hashResult}
            />
            <button
              className={`${styles.copyBtn} ${copied ? styles.copied : ''}`}
              onClick={handleCopy}
              disabled={!hashResult}
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
        <div className={styles.buttons}>
          <button className={styles.btn} onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
