'use client'

import { useRef, useEffect, useCallback, useState, forwardRef, useImperativeHandle } from 'react'
import styles from './Editor.module.css'

const Editor = forwardRef(function Editor({ content, onChange, onCursorChange }, ref) {
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

  const indent = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.focus()
    const start = el.selectionStart
    const end = el.selectionEnd
    const value = el.value
    if (start === end) {
      document.execCommand('insertText', false, '\t')
    } else {
      const lineStart = value.lastIndexOf('\n', start - 1) + 1
      const chunk = value.substring(lineStart, end)
      const indented = chunk.split('\n').map((line) => '\t' + line).join('\n')
      el.setSelectionRange(lineStart, end)
      document.execCommand('insertText', false, indented)
      el.setSelectionRange(lineStart, lineStart + indented.length)
    }
  }, [])

  const dedent = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.focus()
    const start = el.selectionStart
    const end = el.selectionEnd
    const value = el.value
    const lineStart = value.lastIndexOf('\n', start - 1) + 1
    const chunk = value.substring(lineStart, end)
    const dedented = chunk
      .split('\n')
      .map((line) => {
        if (line.startsWith('\t')) return line.slice(1)
        const spaces = line.match(/^ {1,4}/)
        if (spaces) return line.slice(spaces[0].length)
        return line
      })
      .join('\n')
    el.setSelectionRange(lineStart, end)
    document.execCommand('insertText', false, dedented)
    el.setSelectionRange(lineStart, lineStart + dedented.length)
  }, [])

  useImperativeHandle(ref, () => ({
    undo: () => { textareaRef.current?.focus(); document.execCommand('undo') },
    redo: () => { textareaRef.current?.focus(); document.execCommand('redo') },
    cut: () => { textareaRef.current?.focus(); document.execCommand('cut') },
    copy: () => { textareaRef.current?.focus(); document.execCommand('copy') },
    paste: () => { textareaRef.current?.focus(); document.execCommand('paste') },
    delete: () => { textareaRef.current?.focus(); document.execCommand('forwardDelete') },
    selectAll: () => { textareaRef.current?.focus(); textareaRef.current?.select(); updateCursor() },
    indent,
    dedent,
  }), [indent, dedent, updateCursor])

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Tab') {
        e.preventDefault()
        if (e.shiftKey) {
          dedent()
        } else {
          indent()
        }
      }
    },
    [indent, dedent]
  )

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
          onKeyDown={handleKeyDown}
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
})

export default Editor
