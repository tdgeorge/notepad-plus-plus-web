'use client'

import { useRef, useEffect, useCallback, useState } from 'react'
import styles from './Editor.module.css'

export default function Editor({ content, onChange, onCursorChange }) {
  const textareaRef = useRef(null)
  const lineNumbersRef = useRef(null)
  const [lineCount, setLineCount] = useState(1)

  const updateLineCount = useCallback((text) => {
    const lines = text.split('\n').length
    setLineCount(lines)
  }, [])

  const syncScroll = useCallback(() => {
    if (lineNumbersRef.current && textareaRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop
    }
  }, [])

  const updateCursor = useCallback(() => {
    const el = textareaRef.current
    if (!el || !onCursorChange) return
    const pos = el.selectionStart
    const selEnd = el.selectionEnd
    const textBefore = el.value.substring(0, pos)
    const lines = textBefore.split('\n')
    const line = lines.length
    const col = lines[lines.length - 1].length + 1
    const sel = Math.abs(selEnd - pos)
    onCursorChange({ line, col, sel })
  }, [onCursorChange])

  const handleChange = useCallback(
    (e) => {
      const value = e.target.value
      onChange(value)
      updateLineCount(value)
    },
    [onChange, updateLineCount]
  )

  const handleKeyUp = useCallback(
    (e) => {
      updateCursor()
    },
    [updateCursor]
  )

  const handleClick = useCallback(() => {
    updateCursor()
  }, [updateCursor])

  useEffect(() => {
    updateLineCount(content)
  }, [content, updateLineCount])

  useEffect(() => {
    if (textareaRef.current && textareaRef.current.value !== content) {
      textareaRef.current.value = content
      updateLineCount(content)
    }
  }, [content, updateLineCount])

  return (
    <div className={styles.editorWrapper}>
      <div className={styles.editorContainer}>
        <div
          ref={lineNumbersRef}
          className={styles.lineNumbers}
          aria-hidden="true"
        >
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i + 1} className={styles.lineNumber}>
              {i + 1}
            </div>
          ))}
        </div>
        <textarea
          ref={textareaRef}
          className={styles.textarea}
          defaultValue={content}
          onChange={handleChange}
          onKeyUp={handleKeyUp}
          onClick={handleClick}
          onScroll={syncScroll}
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          aria-label="Text editor"
          aria-multiline="true"
        />
      </div>
    </div>
  )
}
