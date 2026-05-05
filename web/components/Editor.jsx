'use client'

import { useRef, useEffect, useCallback, useState, Fragment } from 'react'
import styles from './Editor.module.css'

const TAB_SIZE = 4

function renderSymbols(text, { showWhitespace, showEol, showIndent }) {
  const lines = text.split('\n')
  return lines.map((line, lineIdx) => {
    const isLastLine = lineIdx === lines.length - 1
    const parts = []

    // Find end of leading whitespace for indent guide logic
    let indentEnd = 0
    while (indentEnd < line.length && (line[indentEnd] === ' ' || line[indentEnd] === '\t')) {
      indentEnd++
    }
    const isBlankLine = indentEnd === line.length

    let col = 0
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      const inIndent = i < indentEnd || isBlankLine

      if (ch === '\t') {
        const spacesToNext = TAB_SIZE - (col % TAB_SIZE)
        if (showWhitespace) {
          parts.push(
            <span key={i} className={styles.symTab}>
              {'\u2192' + ' '.repeat(spacesToNext - 1)}
            </span>
          )
        } else if (showIndent && inIndent) {
          parts.push(
            <span key={i} className={styles.symIndent}>
              {'\u2502' + ' '.repeat(spacesToNext - 1)}
            </span>
          )
        } else {
          parts.push(' '.repeat(spacesToNext))
        }
        col += spacesToNext
      } else if (ch === ' ') {
        if (showWhitespace) {
          parts.push(<span key={i} className={styles.symSpace}>{'\u00B7'}</span>)
        } else if (showIndent && inIndent && col % TAB_SIZE === 0) {
          parts.push(<span key={i} className={styles.symIndent}>{'\u2502'}</span>)
        } else {
          parts.push(' ')
        }
        col++
      } else {
        parts.push(ch)
        col++
      }
    }

    if (showEol && !isLastLine) {
      parts.push(<span key="eol" className={styles.symEol}>{'\u00B6'}</span>)
    }

    return (
      <Fragment key={lineIdx}>
        {parts}
        {isLastLine ? null : '\n'}
      </Fragment>
    )
  })
}

export default function Editor({ content, onChange, onCursorChange, wordWrap, fontSize, showWhitespace, showEol, showIndent }) {
  const textareaRef = useRef(null)
  const lineNumbersRef = useRef(null)
  const mirrorRef = useRef(null)
  const [lineCount, setLineCount] = useState(1)

  const effectiveFontSize = fontSize ?? 13
  const lineHeightRatio = 1.5
  const lineHeightPx = effectiveFontSize * lineHeightRatio
  const showSymbols = showWhitespace || showEol || showIndent

  const updateLineCount = useCallback((text) => {
    const lines = text.split('\n').length
    setLineCount(lines)
  }, [])

  const syncScroll = useCallback(() => {
    const ta = textareaRef.current
    if (lineNumbersRef.current && ta) {
      lineNumbersRef.current.scrollTop = ta.scrollTop
    }
    if (mirrorRef.current && ta) {
      mirrorRef.current.scrollTop = ta.scrollTop
      mirrorRef.current.scrollLeft = ta.scrollLeft
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
      <div className={styles.editorContainer} style={{ fontSize: `${effectiveFontSize}px`, lineHeight: lineHeightRatio }}>
        <div
          ref={lineNumbersRef}
          className={styles.lineNumbers}
          aria-hidden="true"
        >
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i + 1} className={styles.lineNumber} style={{ height: `${lineHeightPx}px`, lineHeight: `${lineHeightPx}px` }}>
              {i + 1}
            </div>
          ))}
        </div>
        <div className={styles.textareaWrapper}>
          {showSymbols && (
            <pre
              ref={mirrorRef}
              className={styles.mirror}
              aria-hidden="true"
              style={{ whiteSpace: wordWrap ? 'pre-wrap' : 'pre' }}
            >
              {renderSymbols(content, { showWhitespace, showEol, showIndent })}
            </pre>
          )}
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
            style={{
              whiteSpace: wordWrap ? 'pre-wrap' : 'pre',
              color: showSymbols ? 'transparent' : undefined,
              caretColor: showSymbols ? '#000' : undefined,
            }}
          />
        </div>
      </div>
    </div>
  )
}
