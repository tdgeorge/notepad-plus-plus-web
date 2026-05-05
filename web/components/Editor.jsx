'use client'

import { useRef, useEffect, useCallback, useState, forwardRef, useImperativeHandle, Fragment } from 'react'
import styles from './Editor.module.css'

const TAB_SIZE = 4

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

const Editor = forwardRef(function Editor(
  { content, onChange, onCursorChange, wordWrap, fontSize, showWhitespace, showEol, showIndent },
  ref
) {
  const textareaRef = useRef(null)
  const lineNumbersRef = useRef(null)
  const mirrorRef = useRef(null)
  const [lineCount, setLineCount] = useState(1)
  const onChangeRef = useRef(onChange)
  useEffect(() => { onChangeRef.current = onChange }, [onChange])

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
    () => {
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
    const lineStart = value.lastIndexOf('\n', start - 1) + 1
    if (start === end) {
      // No selection: insert tab at the start of the current line
      el.setSelectionRange(lineStart, lineStart)
      document.execCommand('insertText', false, '\t')
      // Restore cursor shifted right by one (the inserted tab)
      el.setSelectionRange(start + 1, start + 1)
    } else {
      // Selection: prepend tab to every selected line
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
    if (start === end) {
      // No selection: remove leading whitespace from the start of the current line
      const lineText = value.substring(lineStart)
      let removeCount = 0
      if (lineText.startsWith('\t')) {
        removeCount = 1
      } else {
        const spaces = lineText.match(/^ {1,4}/)
        if (spaces) removeCount = spaces[0].length
      }
      if (removeCount > 0) {
        el.setSelectionRange(lineStart, lineStart + removeCount)
        document.execCommand('insertText', false, '')
        // Restore cursor shifted left, but not before the line start
        el.setSelectionRange(
          Math.max(lineStart, start - removeCount),
          Math.max(lineStart, start - removeCount)
        )
      }
    } else {
      // Selection: remove leading whitespace from every selected line
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
    }
  }, [])

  // Scroll the textarea to show the character at `charIndex` without stealing focus.
  const scrollToChar = useCallback((textarea, charIndex) => {
    const linesBeforeMatch = textarea.value.substring(0, charIndex).split('\n').length - 1
    textarea.scrollTop = Math.max(0, linesBeforeMatch * lineHeightPx - textarea.clientHeight / 2)
  }, [lineHeightPx])

  useImperativeHandle(ref, () => ({
    // Edit operations
    undo: () => { textareaRef.current?.focus(); document.execCommand('undo') },
    redo: () => { textareaRef.current?.focus(); document.execCommand('redo') },
    cut: () => { textareaRef.current?.focus(); document.execCommand('cut') },
    copy: () => { textareaRef.current?.focus(); document.execCommand('copy') },
    paste: () => { textareaRef.current?.focus(); document.execCommand('paste') },
    delete: () => { textareaRef.current?.focus(); document.execCommand('forwardDelete') },
    selectAll: () => { textareaRef.current?.focus(); textareaRef.current?.select(); updateCursor() },
    indent,
    dedent,

    // Search operations
    // noFocus: true keeps keyboard focus in the calling element (e.g. IncrementalSearch input)
    findNext(term, options = {}) {
      if (!term || !textareaRef.current) return false
      const { wrapAround = true, noFocus = false } = options
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
        if (noFocus) {
          scrollToChar(textarea, match.index)
        } else {
          textarea.focus()
        }
        textarea.setSelectionRange(match.index, match.index + match[0].length)
        return true
      }
      return false
    },

    findPrev(term, options = {}) {
      if (!term || !textareaRef.current) return false
      const { wrapAround = true, noFocus = false } = options
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
        if (match[0].length === 0) { regex.lastIndex++; break }
      }
      if (!lastMatch && wrapAround) {
        regex.lastIndex = 0
        while ((match = regex.exec(text)) !== null) {
          lastMatch = match
          if (match[0].length === 0) { regex.lastIndex++; break }
        }
      }
      if (lastMatch) {
        if (noFocus) {
          scrollToChar(textarea, lastMatch.index)
        } else {
          textarea.focus()
        }
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
      textarea.scrollTop = Math.max(0, (target - 1) * lineHeightPx - textarea.clientHeight / 2)
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
  }), [indent, dedent, lineCount, updateCursor, updateLineCount, scrollToChar])

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
})

export default Editor
