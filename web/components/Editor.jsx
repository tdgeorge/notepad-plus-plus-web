'use client'

import { useRef, useEffect, useCallback, useState, forwardRef, useImperativeHandle } from 'react'
import styles from './Editor.module.css'

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function buildSearchRegex(term, { matchCase = false, wholeWord = false } = {}) {
  const flags = matchCase ? 'g' : 'gi'
  const escaped = escapeRegex(term)
  const pattern = wholeWord ? `\\b${escaped}\\b` : escaped
  return new RegExp(pattern, flags)
}

const BRACE_PAIRS = { '(': ')', '[': ']', '{': '}', ')': '(', ']': '[', '}': '{' }
const OPEN_BRACES = new Set(['(', '[', '{'])

const Editor = forwardRef(function Editor({ content, onChange, onCursorChange }, ref) {
  const textareaRef = useRef(null)
  const lineNumbersRef = useRef(null)
  const [lineCount, setLineCount] = useState(1)
  const onChangeRef = useRef(onChange)
  useEffect(() => { onChangeRef.current = onChange }, [onChange])

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

  useImperativeHandle(ref, () => ({
    findNext(term, options = {}) {
      if (!term || !textareaRef.current) return false
      const { wrapAround = true } = options
      const textarea = textareaRef.current
      const text = textarea.value
      const fromIndex = textarea.selectionEnd
      const regex = buildSearchRegex(term, options)
      regex.lastIndex = fromIndex
      let match = regex.exec(text)
      if (!match && wrapAround && fromIndex > 0) {
        regex.lastIndex = 0
        match = regex.exec(text)
      }
      if (match) {
        textarea.focus()
        textarea.setSelectionRange(match.index, match.index + match[0].length)
        return true
      }
      return false
    },

    findPrev(term, options = {}) {
      if (!term || !textareaRef.current) return false
      const { wrapAround = true } = options
      const textarea = textareaRef.current
      const text = textarea.value
      const fromIndex = textarea.selectionStart
      const regex = buildSearchRegex(term, options)
      let lastMatch = null
      let match
      regex.lastIndex = 0
      while ((match = regex.exec(text)) !== null) {
        if (match.index < fromIndex) {
          lastMatch = match
        } else {
          break
        }
        if (regex.lastIndex === match.index) break
      }
      if (!lastMatch && wrapAround) {
        regex.lastIndex = 0
        while ((match = regex.exec(text)) !== null) {
          lastMatch = match
          if (regex.lastIndex === match.index) break
        }
      }
      if (lastMatch) {
        textarea.focus()
        textarea.setSelectionRange(lastMatch.index, lastMatch.index + lastMatch[0].length)
        return true
      }
      return false
    },

    replaceOne(term, replacement, options = {}) {
      if (!term || !textareaRef.current) return false
      const textarea = textareaRef.current
      const text = textarea.value
      const { selectionStart, selectionEnd } = textarea
      const selected = text.substring(selectionStart, selectionEnd)
      const compareA = options.matchCase ? selected : selected.toLowerCase()
      const compareB = options.matchCase ? term : term.toLowerCase()
      if (compareA === compareB) {
        const newText = text.substring(0, selectionStart) + replacement + text.substring(selectionEnd)
        const newPos = selectionStart + replacement.length
        textarea.value = newText
        onChangeRef.current(newText)
        updateLineCount(newText)
        textarea.setSelectionRange(newPos, newPos)
      }
      const regex = buildSearchRegex(term, options)
      const searchFrom = textarea.selectionEnd
      regex.lastIndex = searchFrom
      let match = regex.exec(textarea.value)
      if (!match && options.wrapAround !== false) {
        regex.lastIndex = 0
        match = regex.exec(textarea.value)
      }
      if (match) {
        textarea.focus()
        textarea.setSelectionRange(match.index, match.index + match[0].length)
        return true
      }
      textarea.focus()
      return false
    },

    replaceAll(term, replacement, options = {}) {
      if (!term || !textareaRef.current) return 0
      const textarea = textareaRef.current
      const text = textarea.value
      const regex = buildSearchRegex(term, options)
      let count = 0
      const newText = text.replace(regex, (m) => { count++; return replacement })
      if (count > 0) {
        textarea.value = newText
        onChangeRef.current(newText)
        updateLineCount(newText)
        textarea.focus()
        textarea.setSelectionRange(0, 0)
      }
      return count
    },

    goToLine(lineNum) {
      if (!textareaRef.current) return
      const textarea = textareaRef.current
      const lines = textarea.value.split('\n')
      const target = Math.max(1, Math.min(lineNum, lines.length))
      let pos = 0
      for (let i = 0; i < target - 1; i++) {
        pos += lines[i].length + 1
      }
      textarea.focus()
      textarea.setSelectionRange(pos, pos)
      const approxLineHeight = 20
      textarea.scrollTop = Math.max(0, (target - 1) * approxLineHeight - textarea.clientHeight / 2)
      updateCursor()
    },

    getSelectedText() {
      if (!textareaRef.current) return ''
      const { selectionStart, selectionEnd, value } = textareaRef.current
      return value.substring(selectionStart, selectionEnd)
    },

    selectWordAtCursor() {
      if (!textareaRef.current) return ''
      const textarea = textareaRef.current
      const text = textarea.value
      let start = textarea.selectionStart
      let end = textarea.selectionEnd
      if (start === end) {
        while (start > 0 && /\w/.test(text[start - 1])) start--
        while (end < text.length && /\w/.test(text[end])) end++
        textarea.setSelectionRange(start, end)
      }
      return text.substring(start, end)
    },

    goToMatchingBrace() {
      if (!textareaRef.current) return
      const textarea = textareaRef.current
      const text = textarea.value
      const pos = textarea.selectionStart
      const char = text[pos]
      if (!BRACE_PAIRS[char]) return
      const isOpen = OPEN_BRACES.has(char)
      const target = BRACE_PAIRS[char]
      let depth = 0
      if (isOpen) {
        for (let i = pos; i < text.length; i++) {
          if (text[i] === char) depth++
          else if (text[i] === target && --depth === 0) {
            textarea.focus()
            textarea.setSelectionRange(i, i + 1)
            return
          }
        }
      } else {
        for (let i = pos; i >= 0; i--) {
          if (text[i] === char) depth++
          else if (text[i] === target && --depth === 0) {
            textarea.focus()
            textarea.setSelectionRange(i, i + 1)
            return
          }
        }
      }
    },

    getLineCount() {
      return lineCount
    },

    focus() {
      textareaRef.current?.focus()
    },
  }), [lineCount, updateCursor, updateLineCount])

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
})

export default Editor
