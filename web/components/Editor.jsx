'use client'

import { useRef, useEffect, useCallback, useState, useMemo, forwardRef, useImperativeHandle, Fragment } from 'react'
import styles from './Editor.module.css'
import { TOKENIZERS } from '../lib/languages/index'
import { TOKEN } from '../lib/languages/javascript'

const TAB_SIZE = 4

// Files larger than this threshold (~100 KB) bypass expensive processing so they
// remain responsive. Heavy features (syntax highlighting, fold detection) are
// disabled and line numbers are virtualised.
const LARGE_FILE_THRESHOLD = 100_000
// Extra lines rendered above/below the visible viewport during virtual scrolling
const VIRTUAL_BUFFER = 20

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

// ── Fold region detection ─────────────────────────────────────────────────────

const FOLD_OPEN = new Set(['{', '(', '['])
const FOLD_CLOSE_TO_OPEN = { '}': '{', ')': '(', ']': '[' }

/**
 * Scan the text for bracket pairs that span multiple lines.
 * Returns an array of { startLine, endLine } objects (0-indexed).
 */
function computeFoldRegions(text) {
  const lines = text.split('\n')
  const regions = []
  const stack = [] // { char, lineIdx }

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx]
    let inString = null // null | '"' | "'" | '`'

    for (let col = 0; col < line.length; col++) {
      const ch = line[col]

      if (inString) {
        if (ch === inString) {
          // Count preceding backslashes; odd count means the quote is escaped
          let slashes = 0
          while (col - 1 - slashes >= 0 && line[col - 1 - slashes] === '\\') slashes++
          if (slashes % 2 === 0) inString = null
        }
        continue
      }
      if (ch === '"' || ch === "'" || ch === '`') { inString = ch; continue }
      // Skip line comments
      if (ch === '/' && col + 1 < line.length && line[col + 1] === '/') break

      if (FOLD_OPEN.has(ch)) {
        stack.push({ char: ch, lineIdx })
      } else if (FOLD_CLOSE_TO_OPEN[ch]) {
        const expected = FOLD_CLOSE_TO_OPEN[ch]
        for (let i = stack.length - 1; i >= 0; i--) {
          if (stack[i].char === expected) {
            const startLine = stack[i].lineIdx
            stack.splice(i, 1)
            if (lineIdx > startLine) {
              regions.push({ startLine, endLine: lineIdx })
            }
            break
          }
        }
      }
    }
  }

  return regions
}

/**
 * Build a Map<startLine, foldRegion> keeping the largest (outermost) region
 * when multiple regions share the same start line.
 */
function buildFoldableMap(foldRegions) {
  const map = new Map()
  for (const r of foldRegions) {
    const existing = map.get(r.startLine)
    if (!existing || r.endLine > existing.endLine) map.set(r.startLine, r)
  }
  return map
}

/**
 * Returns a Set of line indices that are hidden because they fall inside a
 * collapsed fold region.
 */
function computeHiddenLines(foldRegions, foldedLines) {
  const hidden = new Set()
  for (const { startLine, endLine } of foldRegions) {
    if (foldedLines.has(startLine)) {
      for (let i = startLine + 1; i <= endLine; i++) hidden.add(i)
    }
  }
  return hidden
}

// ── Line-by-line mirror rendering with fold support ───────────────────────────

/**
 * Split a flat token stream (as returned by a tokenizer) into per-line groups.
 * Returns Array<Array<{type, value}>> – one sub-array per line.
 */
function tokenizeToLines(tokens) {
  const lineGroups = [[]]
  for (const token of tokens) {
    const parts = token.value.split('\n')
    for (let i = 0; i < parts.length; i++) {
      if (i > 0) lineGroups.push([])
      if (parts[i] !== '') {
        lineGroups[lineGroups.length - 1].push({ type: token.type, value: parts[i] })
      }
    }
  }
  return lineGroups
}

/**
 * Render the mirror content line-by-line for when fold regions are active.
 * Uses the tokenizer when available; otherwise falls back to plain text.
 * Each line is wrapped in a <span className={styles.mirrorLine}> (display:block).
 * Hidden lines are rendered as zero-height <span> elements.
 */
function renderLinesWithFolds(code, tokenizeFn, symbolOpts, hiddenLines, foldedLines) {
  const rawLines = code.split('\n')

  // Build per-line highlighted content using the full-content tokenizer
  // (preserves multi-line state like block-comments)
  let lineGroups = null
  if (tokenizeFn) {
    const tokens = tokenizeFn(code)
    lineGroups = tokenizeToLines(tokens)
  }

  return rawLines.map((rawLine, i) => {
    if (hiddenLines.has(i)) {
      return <span key={i} className={styles.hiddenLine} aria-hidden="true" />
    }

    let lineContent
    if (lineGroups) {
      const toks = lineGroups[i] ?? []
      lineContent = toks.length > 0
        ? toks.map(({ type, value }, j) => {
            const cls = TOKEN_CLASSES[type]
            return cls ? <span key={j} className={cls}>{value}</span> : value
          })
        : rawLine
    } else {
      // Plain text with optional whitespace symbols (simplified per-line)
      lineContent = renderLineSymbols(rawLine, symbolOpts)
    }

    return (
      <span key={i} className={styles.mirrorLine}>
        {lineContent}
        {foldedLines.has(i) && <span className={styles.foldEllipsis}> ⋯</span>}
      </span>
    )
  })
}

/**
 * Render a single line with whitespace/indent symbols (no newline handling).
 */
function renderLineSymbols(line, { showWhitespace, showEol, showIndent } = {}) {
  if (!showWhitespace && !showEol && !showIndent) return line

  let indentEnd = 0
  while (indentEnd < line.length && (line[indentEnd] === ' ' || line[indentEnd] === '\t')) {
    indentEnd++
  }
  const isBlank = indentEnd === line.length
  const parts = []
  let col = 0

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    const inIndent = isBlank || i < indentEnd

    if (ch === '\t') {
      const fill = TAB_SIZE - (col % TAB_SIZE)
      if (showWhitespace) {
        parts.push(<span key={i} className={styles.symTab}>{'\u2192' + ' '.repeat(fill - 1)}</span>)
      } else if (showIndent && inIndent) {
        parts.push(<span key={i} className={styles.symIndent}>{'\u2502' + ' '.repeat(fill - 1)}</span>)
      } else {
        parts.push(' '.repeat(fill))
      }
      col += fill
    } else if (ch === ' ') {
      if (showWhitespace) {
        parts.push(<span key={i} className={styles.symSpace}>{'\u00B7'}</span>)
      } else if (showIndent && inIndent && col % TAB_SIZE === 0) {
        parts.push(<span key={i} className={styles.symIndent}>{'\u2502'}</span>)
      } else {
        parts.push(ch)
      }
      col++
    } else {
      parts.push(ch)
      col++
    }
  }
  return parts
}

/** Maps a TOKEN type to the corresponding CSS module class name */
const TOKEN_CLASSES = {
  [TOKEN.KEYWORD]: styles.hlKeyword,
  [TOKEN.TYPE]: styles.hlType,
  [TOKEN.BROWSER_API]: styles.hlBrowserApi,
  [TOKEN.NUMBER]: styles.hlNumber,
  [TOKEN.STRING]: styles.hlString,
  [TOKEN.TEMPLATE]: styles.hlTemplate,
  [TOKEN.COMMENT]: styles.hlComment,
  [TOKEN.COMMENT_DOC]: styles.hlCommentDoc,
  [TOKEN.REGEX]: styles.hlRegex,
  [TOKEN.OPERATOR]: styles.hlOperator,
  [TOKEN.TAG]: styles.hlTag,
  [TOKEN.ATTRIBUTE]: styles.hlAttribute,
  [TOKEN.HEADING]: styles.hlHeading,
  [TOKEN.BOLD]: styles.hlBold,
  [TOKEN.ITALIC]: styles.hlItalic,
}

/**
 * Render syntax-highlighted content for the mirror <pre>.
 * When whitespace/EOL/indent symbols are also requested the two effects are
 * merged in a single character-by-character pass so the mirror stays in sync
 * with the textarea.
 *
 * @param {string} code  Full editor text.
 * @param {function} tokenize  Language tokenizer (returns [{type,value}]).
 * @param {{ showWhitespace: boolean, showEol: boolean, showIndent: boolean }} symbolOpts
 * @returns {React.ReactNode[]}
 */
function renderHighlighted(code, tokenize, { showWhitespace, showEol, showIndent }) {
  const tokens = tokenize(code)
  const showAnySymbols = showWhitespace || showEol || showIndent

  // ── Fast path: no whitespace symbols — wrap tokens in coloured spans ──────
  if (!showAnySymbols) {
    return tokens.map(({ type, value }, i) => {
      const cls = TOKEN_CLASSES[type]
      return cls ? <span key={i} className={cls}>{value}</span> : value
    })
  }

  // ── Combined path: syntax colours + whitespace symbol rendering ───────────
  // Pre-compute the indent end (last leading-whitespace column) per line so we
  // can correctly place indent guide markers.
  const lines = code.split('\n')
  const lineIndentEnds = lines.map((line) => {
    let k = 0
    while (k < line.length && (line[k] === ' ' || line[k] === '\t')) k++
    return k === line.length ? -1 : k // -1 signals a blank line
  })

  const result = []
  let lineIdx = 0
  let col = 0

  for (let ti = 0; ti < tokens.length; ti++) {
    const { type, value } = tokens[ti]
    const cls = TOKEN_CLASSES[type]
    const parts = []

    for (let ci = 0; ci < value.length; ci++) {
      const ch = value[ci]
      const indentEnd = lineIndentEnds[lineIdx] ?? -1
      const isBlank = indentEnd === -1
      const inIndent = isBlank || col < indentEnd

      if (ch === '\n') {
        if (showEol) {
          parts.push(<span key={`eol-${ti}-${ci}`} className={styles.symEol}>{'\u00B6'}</span>)
        }
        parts.push('\n')
        lineIdx++
        col = 0
      } else if (ch === '\t') {
        const fill = TAB_SIZE - (col % TAB_SIZE)
        if (showWhitespace) {
          parts.push(
            <span key={`tab-${ti}-${ci}`} className={styles.symTab}>
              {'\u2192' + ' '.repeat(fill - 1)}
            </span>
          )
        } else if (showIndent && inIndent) {
          parts.push(
            <span key={`tab-${ti}-${ci}`} className={styles.symIndent}>
              {'\u2502' + ' '.repeat(fill - 1)}
            </span>
          )
        } else {
          parts.push(' '.repeat(fill))
        }
        col += fill
      } else if (ch === ' ') {
        if (showWhitespace) {
          parts.push(<span key={`sp-${ti}-${ci}`} className={styles.symSpace}>{'\u00B7'}</span>)
        } else if (showIndent && inIndent && col % TAB_SIZE === 0) {
          parts.push(<span key={`sp-${ti}-${ci}`} className={styles.symIndent}>{'\u2502'}</span>)
        } else {
          parts.push(ch)
        }
        col++
      } else {
        parts.push(ch)
        col++
      }
    }

    if (parts.length === 0) continue

    if (cls) {
      result.push(<span key={ti} className={cls}>{parts}</span>)
    } else {
      result.push(<Fragment key={ti}>{parts}</Fragment>)
    }
  }

  return result
}

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
  { content, onChange, onCursorChange, wordWrap, fontSize, showWhitespace, showEol, showIndent, language, onUndo, onRedo },
  ref
) {
  const textareaRef = useRef(null)
  const lineNumbersRef = useRef(null)
  const mirrorRef = useRef(null)
  const [lineCount, setLineCount] = useState(1)
  const onChangeRef = useRef(onChange)
  useEffect(() => { onChangeRef.current = onChange }, [onChange])
  const onUndoRef = useRef(onUndo)
  useEffect(() => { onUndoRef.current = onUndo }, [onUndo])
  const onRedoRef = useRef(onRedo)
  useEffect(() => { onRedoRef.current = onRedo }, [onRedo])

  // ── Large-file mode ───────────────────────────────────────────────────────
  // Skip every expensive O(n) operation when the file exceeds the threshold.
  const isLargeFile = content.length > LARGE_FILE_THRESHOLD

  // Scroll-top of the textarea, tracked so we can virtualise line numbers.
  const [editorScrollTop, setEditorScrollTop] = useState(0)
  // Client height of the textarea, tracked so virtual rendering adjusts on resize.
  const [editorClientHeight, setEditorClientHeight] = useState(2000)
  // Ref-copy of isLargeFile so syncScroll (stable callback) can read it.
  const isLargeFileRef = useRef(isLargeFile)
  useEffect(() => { isLargeFileRef.current = isLargeFile }, [isLargeFile])

  // Measure (and track) the textarea's client height so virtual rendering
  // stays accurate even after window resize.
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    setEditorClientHeight(ta.clientHeight)
    const ro = new ResizeObserver(() => {
      if (isLargeFileRef.current) setEditorClientHeight(ta.clientHeight)
    })
    ro.observe(ta)
    return () => ro.disconnect()
  }, []) // run once on mount; the ResizeObserver keeps it fresh

  // ── Fold state ────────────────────────────────────────────────────────────
  const [foldedLines, setFoldedLines] = useState(new Set())

  // Skip character-by-character fold scan for large files — it can block for
  // hundreds of milliseconds on multi-MB documents.
  const foldRegions = useMemo(
    () => (isLargeFile ? [] : computeFoldRegions(content)),
    [content, isLargeFile]
  )
  const foldableMap = useMemo(() => buildFoldableMap(foldRegions), [foldRegions])
  const hiddenLines = useMemo(
    () => computeHiddenLines(foldRegions, foldedLines),
    [foldRegions, foldedLines]
  )

  // Keep a ref so foldAll/unfoldAll inside useImperativeHandle can access them
  const foldRegionsRef = useRef(foldRegions)
  useEffect(() => { foldRegionsRef.current = foldRegions }, [foldRegions])

  const toggleFold = useCallback((startLine) => {
    setFoldedLines((prev) => {
      const next = new Set(prev)
      if (next.has(startLine)) {
        next.delete(startLine)
      } else {
        next.add(startLine)
      }
      return next
    })
  }, [])

  const effectiveFontSize = fontSize ?? 13
  const lineHeightRatio = 1.5
  const lineHeightPx = effectiveFontSize * lineHeightRatio
  const showSymbols = showWhitespace || showEol || showIndent

  // ── Mirror content ────────────────────────────────────────────────────────
  const tokenizeFn = language ? TOKENIZERS[language] : null

  // When folds are active use the line-by-line renderer; otherwise keep the
  // original flat renderer (better whitespace-symbol support, fewer rerenders).
  // For large files skip all of this — tokenising a multi-MB document creates
  // millions of React nodes and makes the UI unresponsive.
  const mirrorContent = useMemo(() => {
    if (isLargeFile) return null
    const hasFolds = foldedLines.size > 0
    if (hasFolds) {
      return renderLinesWithFolds(
        content, tokenizeFn,
        { showWhitespace, showEol, showIndent },
        hiddenLines, foldedLines
      )
    }
    if (tokenizeFn) {
      return renderHighlighted(content, tokenizeFn, { showWhitespace, showEol, showIndent })
    }
    if (showSymbols) {
      return renderSymbols(content, { showWhitespace, showEol, showIndent })
    }
    return null
  }, [isLargeFile, content, tokenizeFn, showWhitespace, showEol, showIndent, foldedLines, hiddenLines, showSymbols])

  // The mirror <pre> is shown when syntax highlighting is active, any
  // whitespace / EOL / indent guide symbol is enabled, or folds are present.
  // Never shown for large files (textarea renders plain text natively).
  const showMirror = !isLargeFile && (showSymbols || !!tokenizeFn || foldedLines.size > 0)

  const updateLineCount = useCallback((text) => {
    const lines = text.split('\n').length
    setLineCount(lines)
  }, [])

  const syncScroll = useCallback(() => {
    const ta = textareaRef.current
    if (!ta) return
    if (lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = ta.scrollTop
    }
    if (mirrorRef.current) {
      mirrorRef.current.scrollTop = ta.scrollTop
      mirrorRef.current.scrollLeft = ta.scrollLeft
    }
    if (isLargeFileRef.current) {
      setEditorScrollTop(ta.scrollTop)
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
    undo: () => { textareaRef.current?.focus(); onUndoRef.current?.() },
    redo: () => { textareaRef.current?.focus(); onRedoRef.current?.() },
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

    // ── Fold operations ───────────────────────────────────────────────────
    foldAll() {
      const allStarts = new Set(foldRegionsRef.current.map((r) => r.startLine))
      setFoldedLines(allStarts)
    },

    unfoldAll() {
      setFoldedLines(new Set())
    },

    // ── EOL Conversion ────────────────────────────────────────────────────
    'eol-crlf': () => {
      const el = textareaRef.current
      if (!el) return
      const newText = el.value.replace(/\r\n|\r|\n/g, '\r\n')
      if (newText === el.value) return
      el.value = newText
      onChangeRef.current(newText)
      updateLineCount(newText)
    },

    'eol-lf': () => {
      const el = textareaRef.current
      if (!el) return
      const newText = el.value.replace(/\r\n|\r/g, '\n')
      if (newText === el.value) return
      el.value = newText
      onChangeRef.current(newText)
      updateLineCount(newText)
    },

    'eol-cr': () => {
      const el = textareaRef.current
      if (!el) return
      const newText = el.value.replace(/\r\n|\n/g, '\r')
      if (newText === el.value) return
      el.value = newText
      onChangeRef.current(newText)
      updateLineCount(newText)
    },

    // ── Blank Operations ──────────────────────────────────────────────────
    'trim-both': () => {
      const el = textareaRef.current
      if (!el) return
      const newText = el.value.split('\n').map((line) => line.trim()).join('\n')
      if (newText === el.value) return
      el.value = newText
      onChangeRef.current(newText)
      updateLineCount(newText)
    },

    'trim-leading': () => {
      const el = textareaRef.current
      if (!el) return
      const newText = el.value.split('\n').map((line) => line.replace(/^\s+/, '')).join('\n')
      if (newText === el.value) return
      el.value = newText
      onChangeRef.current(newText)
      updateLineCount(newText)
    },

    'trim-trailing': () => {
      const el = textareaRef.current
      if (!el) return
      const newText = el.value.split('\n').map((line) => line.replace(/\s+$/, '')).join('\n')
      if (newText === el.value) return
      el.value = newText
      onChangeRef.current(newText)
      updateLineCount(newText)
    },

    'eol-to-space': () => {
      const el = textareaRef.current
      if (!el) return
      const newText = el.value.replace(/\n/g, ' ')
      if (newText === el.value) return
      el.value = newText
      onChangeRef.current(newText)
      updateLineCount(newText)
    },

    'remove-blank-eol': () => {
      // Remove blank/whitespace-only lines and trim trailing whitespace from remaining lines
      const el = textareaRef.current
      if (!el) return
      const newText = el.value
        .split('\n')
        .filter((line) => line.trim() !== '')
        .map((line) => line.replace(/\s+$/, ''))
        .join('\n')
      if (newText === el.value) return
      el.value = newText
      onChangeRef.current(newText)
      updateLineCount(newText)
    },

    'remove-blank': () => {
      // Remove lines that consist entirely of whitespace
      const el = textareaRef.current
      if (!el) return
      const newText = el.value
        .split('\n')
        .filter((line) => line.trim() !== '')
        .join('\n')
      if (newText === el.value) return
      el.value = newText
      onChangeRef.current(newText)
      updateLineCount(newText)
    },

    // ── Line Operations ───────────────────────────────────────────────────
    'line-duplicate': () => {
      const el = textareaRef.current
      if (!el) return
      const value = el.value
      const pos = el.selectionStart
      const lineStart = value.lastIndexOf('\n', pos - 1) + 1
      const lineEnd = value.indexOf('\n', pos)
      const line = lineEnd === -1 ? value.substring(lineStart) : value.substring(lineStart, lineEnd)
      const insertAt = lineEnd === -1 ? value.length : lineEnd
      const newText = value.substring(0, insertAt) + '\n' + line + value.substring(insertAt)
      const colInLine = pos - lineStart
      const newPos = insertAt + 1 + colInLine
      el.value = newText
      onChangeRef.current(newText)
      updateLineCount(newText)
      el.setSelectionRange(newPos, newPos)
      el.focus()
    },

    'line-move-up': () => {
      const el = textareaRef.current
      if (!el) return
      const value = el.value
      const pos = el.selectionStart
      const lineStart = value.lastIndexOf('\n', pos - 1) + 1
      if (lineStart === 0) return // already at first line
      const colInLine = pos - lineStart
      const lineEnd = value.indexOf('\n', pos)
      const currentLine = lineEnd === -1 ? value.substring(lineStart) : value.substring(lineStart, lineEnd)
      const prevLineEnd = lineStart - 1 // index of \n before current line
      const prevLineStart = value.lastIndexOf('\n', prevLineEnd - 1) + 1
      const prevLine = value.substring(prevLineStart, prevLineEnd)
      const before = value.substring(0, prevLineStart)
      const after = lineEnd === -1 ? '' : value.substring(lineEnd)
      const newText = before + currentLine + '\n' + prevLine + after
      const newPos = prevLineStart + Math.min(colInLine, currentLine.length)
      el.value = newText
      onChangeRef.current(newText)
      updateLineCount(newText)
      el.setSelectionRange(newPos, newPos)
      el.focus()
    },

    'line-move-down': () => {
      const el = textareaRef.current
      if (!el) return
      const value = el.value
      const pos = el.selectionStart
      const lineStart = value.lastIndexOf('\n', pos - 1) + 1
      const lineEnd = value.indexOf('\n', pos)
      if (lineEnd === -1) return // already at last line
      const colInLine = pos - lineStart
      const currentLine = value.substring(lineStart, lineEnd)
      const nextLineStart = lineEnd + 1
      const nextLineEnd = value.indexOf('\n', nextLineStart)
      const nextLine = nextLineEnd === -1 ? value.substring(nextLineStart) : value.substring(nextLineStart, nextLineEnd)
      const before = value.substring(0, lineStart)
      const after = nextLineEnd === -1 ? '' : value.substring(nextLineEnd)
      const newText = before + nextLine + '\n' + currentLine + after
      const newPos = lineStart + nextLine.length + 1 + Math.min(colInLine, currentLine.length)
      el.value = newText
      onChangeRef.current(newText)
      updateLineCount(newText)
      el.setSelectionRange(newPos, newPos)
      el.focus()
    },

    'line-delete': () => {
      const el = textareaRef.current
      if (!el) return
      const value = el.value
      const pos = el.selectionStart
      const lineStart = value.lastIndexOf('\n', pos - 1) + 1
      const lineEnd = value.indexOf('\n', pos)
      let newText, newPos
      if (lineEnd === -1) {
        // Last line
        newText = lineStart === 0 ? '' : value.substring(0, lineStart - 1)
        newPos = newText.length
      } else {
        newText = value.substring(0, lineStart) + value.substring(lineEnd + 1)
        newPos = lineStart
      }
      el.value = newText
      onChangeRef.current(newText)
      updateLineCount(newText)
      el.setSelectionRange(newPos, newPos)
      el.focus()
    },

    'sort-asc': () => {
      const el = textareaRef.current
      if (!el) return
      const newText = el.value.split('\n').sort((a, b) => a.localeCompare(b)).join('\n')
      if (newText === el.value) return
      el.value = newText
      onChangeRef.current(newText)
      updateLineCount(newText)
      el.setSelectionRange(0, 0)
      el.focus()
    },

    'sort-desc': () => {
      const el = textareaRef.current
      if (!el) return
      const newText = el.value.split('\n').sort((a, b) => b.localeCompare(a)).join('\n')
      if (newText === el.value) return
      el.value = newText
      onChangeRef.current(newText)
      updateLineCount(newText)
      el.setSelectionRange(0, 0)
      el.focus()
    },

    'remove-duplicate-lines': () => {
      const el = textareaRef.current
      if (!el) return
      const seen = new Set()
      const newText = el.value.split('\n').filter((line) => {
        if (seen.has(line)) return false
        seen.add(line)
        return true
      }).join('\n')
      if (newText === el.value) return
      el.value = newText
      onChangeRef.current(newText)
      updateLineCount(newText)
      el.setSelectionRange(0, 0)
      el.focus()
    },

    'remove-empty-lines': () => {
      const el = textareaRef.current
      if (!el) return
      const newText = el.value.split('\n').filter((line) => line !== '').join('\n')
      if (newText === el.value) return
      el.value = newText
      onChangeRef.current(newText)
      updateLineCount(newText)
      el.setSelectionRange(0, 0)
      el.focus()
    },
  }), [indent, dedent, lineCount, lineHeightPx, updateCursor, updateLineCount, scrollToChar])

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Tab') {
        e.preventDefault()
        if (e.shiftKey) {
          dedent()
        } else {
          indent()
        }
      } else if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        onUndoRef.current?.()
      } else if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
        e.preventDefault()
        onRedoRef.current?.()
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
          {isLargeFile ? (() => {
            // Virtual rendering: only materialise the line numbers that are
            // within (or close to) the current viewport.  Spacer divs above
            // and below keep the total scroll height correct so that the
            // manually-synced scrollTop from syncScroll still maps correctly.
            const firstVisible = Math.max(0, Math.floor((editorScrollTop - 4) / lineHeightPx) - VIRTUAL_BUFFER)
            const lastVisible = Math.min(lineCount - 1, Math.ceil((editorScrollTop + editorClientHeight) / lineHeightPx) + VIRTUAL_BUFFER)
            const items = []
            if (firstVisible > 0) {
              items.push(<div key="top" style={{ height: firstVisible * lineHeightPx }} />)
            }
            for (let i = firstVisible; i <= lastVisible; i++) {
              items.push(<div key={i} className={styles.lineNumber}>{i + 1}</div>)
            }
            if (lastVisible < lineCount - 1) {
              items.push(<div key="bot" style={{ height: (lineCount - 1 - lastVisible) * lineHeightPx }} />)
            }
            return items
          })() : Array.from({ length: lineCount }, (_, i) => {
            if (hiddenLines.has(i)) {
              return <div key={i} className={styles.lineNumberHidden} aria-hidden="true" />
            }
            const region = foldableMap.get(i)
            const isFolded = foldedLines.has(i)
            return (
              <div
                key={i}
                className={styles.lineNumber}
              >
                {region && (
                  <button
                    className={styles.foldBtn}
                    onClick={() => toggleFold(i)}
                    aria-label={isFolded ? 'Expand fold' : 'Collapse fold'}
                    title={isFolded ? 'Expand' : 'Collapse'}
                  >
                    {isFolded ? '+' : '\u2212'}
                  </button>
                )}
                {i + 1}
              </div>
            )
          })}
        </div>
        <div className={styles.textareaWrapper}>
          {showMirror && (
            <pre
              ref={mirrorRef}
              className={styles.mirror}
              aria-hidden="true"
              style={{ whiteSpace: wordWrap ? 'pre-wrap' : 'pre' }}
            >
              {mirrorContent}
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
              color: showMirror ? 'transparent' : undefined,
              caretColor: showMirror ? 'var(--editor-fg)' : undefined,
            }}
          />
        </div>
      </div>
    </div>
  )
})

export default Editor
