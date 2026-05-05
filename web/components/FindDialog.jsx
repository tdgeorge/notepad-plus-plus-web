'use client'

import { useState, useEffect, useRef } from 'react'
import styles from './FindDialog.module.css'

export default function FindDialog({ isOpen, mode = 'find', onClose, onFindNext, onFindPrev, onReplace, onReplaceAll }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [replaceTerm, setReplaceTerm] = useState('')
  const [matchCase, setMatchCase] = useState(false)
  const [wholeWord, setWholeWord] = useState(false)
  const [wrapAround, setWrapAround] = useState(true)
  const [isReplace, setIsReplace] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [replaceCount, setReplaceCount] = useState(null)
  const searchInputRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      setIsReplace(mode === 'replace')
      setNotFound(false)
      setReplaceCount(null)
      setTimeout(() => searchInputRef.current?.focus(), 0)
    }
  }, [isOpen, mode])

  if (!isOpen) return null

  const options = { matchCase, wholeWord, wrapAround }

  const handleFindNext = () => {
    if (!searchTerm) return
    const found = onFindNext(searchTerm, options)
    setNotFound(!found)
    setReplaceCount(null)
  }

  const handleFindPrev = () => {
    if (!searchTerm) return
    const found = onFindPrev(searchTerm, options)
    setNotFound(!found)
    setReplaceCount(null)
  }

  const handleReplace = () => {
    if (!searchTerm) return
    onReplace(searchTerm, replaceTerm, options)
    setNotFound(false)
    setReplaceCount(null)
  }

  const handleReplaceAll = () => {
    if (!searchTerm) return
    const count = onReplaceAll(searchTerm, replaceTerm, options)
    setReplaceCount(count)
    setNotFound(false)
  }

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Escape') { onClose(); return }
    if (e.key === 'Enter') { e.shiftKey ? handleFindPrev() : handleFindNext() }
  }

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value)
    setNotFound(false)
    setReplaceCount(null)
  }

  return (
    <div className={styles.dialog} role="dialog" aria-label={isReplace ? 'Replace' : 'Find'}>
      <div className={styles.titleBar}>
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${!isReplace ? styles.activeTab : ''}`}
            onClick={() => { setIsReplace(false); setReplaceCount(null) }}
          >
            Find
          </button>
          <button
            className={`${styles.tab} ${isReplace ? styles.activeTab : ''}`}
            onClick={() => { setIsReplace(true); setReplaceCount(null) }}
          >
            Replace
          </button>
        </div>
        <button className={styles.closeBtn} onClick={onClose} aria-label="Close">×</button>
      </div>
      <div className={styles.body}>
        <div className={styles.row}>
          <label className={styles.label}>Find what:</label>
          <input
            ref={searchInputRef}
            className={`${styles.input} ${notFound ? styles.notFound : ''}`}
            type="text"
            value={searchTerm}
            onChange={handleSearchChange}
            onKeyDown={handleSearchKeyDown}
          />
        </div>
        {isReplace && (
          <div className={styles.row}>
            <label className={styles.label}>Replace with:</label>
            <input
              className={styles.input}
              type="text"
              value={replaceTerm}
              onChange={(e) => setReplaceTerm(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Escape') onClose() }}
            />
          </div>
        )}
        <div className={styles.options}>
          <label className={styles.checkbox}>
            <input type="checkbox" checked={matchCase} onChange={(e) => setMatchCase(e.target.checked)} />
            {' '}Match case
          </label>
          <label className={styles.checkbox}>
            <input type="checkbox" checked={wholeWord} onChange={(e) => setWholeWord(e.target.checked)} />
            {' '}Whole word
          </label>
          <label className={styles.checkbox}>
            <input type="checkbox" checked={wrapAround} onChange={(e) => setWrapAround(e.target.checked)} />
            {' '}Wrap around
          </label>
        </div>
        {notFound && <div className={styles.message}>Not found.</div>}
        {replaceCount !== null && (
          <div className={styles.message}>{replaceCount} occurrence(s) replaced.</div>
        )}
      </div>
      <div className={styles.buttons}>
        <button className={styles.btn} onClick={handleFindNext} disabled={!searchTerm}>Find Next</button>
        <button className={styles.btn} onClick={handleFindPrev} disabled={!searchTerm}>Find Previous</button>
        {isReplace && (
          <>
            <button className={styles.btn} onClick={handleReplace} disabled={!searchTerm}>Replace</button>
            <button className={styles.btn} onClick={handleReplaceAll} disabled={!searchTerm}>Replace All</button>
          </>
        )}
        <button className={styles.btn} onClick={onClose}>Close</button>
      </div>
    </div>
  )
}
