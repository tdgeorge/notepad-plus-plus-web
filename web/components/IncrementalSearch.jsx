'use client'

import { useState, useEffect, useRef } from 'react'
import styles from './IncrementalSearch.module.css'

export default function IncrementalSearch({ isOpen, onClose, onSearch, onSearchNext, onSearchPrev }) {
  const [term, setTerm] = useState('')
  const [notFound, setNotFound] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      setTerm('')
      setNotFound(false)
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleChange = (e) => {
    const val = e.target.value
    setTerm(val)
    if (val) {
      const found = onSearch(val)
      setNotFound(!found)
    } else {
      setNotFound(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose()
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (e.shiftKey) {
        const found = onSearchPrev(term)
        setNotFound(!found)
      } else {
        const found = onSearchNext(term)
        setNotFound(!found)
      }
    }
  }

  return (
    <div className={styles.bar}>
      <span className={styles.label}>Find:</span>
      <input
        ref={inputRef}
        className={`${styles.input} ${notFound ? styles.notFound : ''}`}
        type="text"
        value={term}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Type to search…"
      />
      <button
        className={styles.navBtn}
        onClick={() => { if (term) { const f = onSearchPrev(term); setNotFound(!f) } }}
        title="Find Previous (Shift+Enter)"
        disabled={!term}
      >
        ◀
      </button>
      <button
        className={styles.navBtn}
        onClick={() => { if (term) { const f = onSearchNext(term); setNotFound(!f) } }}
        title="Find Next (Enter)"
        disabled={!term}
      >
        ▶
      </button>
      {notFound && <span className={styles.notFoundMsg}>Not found</span>}
      <button className={styles.closeBtn} onClick={onClose} aria-label="Close incremental search">×</button>
    </div>
  )
}
