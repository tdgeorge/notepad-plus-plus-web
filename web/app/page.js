'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import MenuBar from '../components/MenuBar'
import Toolbar from '../components/Toolbar'
import TabBar from '../components/TabBar'
import Editor from '../components/Editor'
import StatusBar from '../components/StatusBar'
import FindDialog from '../components/FindDialog'
import GoToDialog from '../components/GoToDialog'
import IncrementalSearch from '../components/IncrementalSearch'
import styles from './page.module.css'

let nextTabId = 2

export default function Home() {
  const [tabs, setTabs] = useState([{ id: 1, name: 'new 1', content: '', modified: false }])
  const [activeTabId, setActiveTabId] = useState(1)
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1, sel: 0 })
  const [findDialogOpen, setFindDialogOpen] = useState(false)
  const [findDialogMode, setFindDialogMode] = useState('find')
  const [goToDialogOpen, setGoToDialogOpen] = useState(false)
  const [incrementalSearchOpen, setIncrementalSearchOpen] = useState(false)

  const editorRef = useRef(null)
  const searchStateRef = useRef({ term: '', options: { matchCase: false, wholeWord: false, wrapAround: true } })

  const activeTab = tabs.find((t) => t.id === activeTabId)
  const lineCount = (activeTab?.content ?? '').split('\n').length

  const handleNewTab = useCallback(() => {
    const id = nextTabId++
    const name = `new ${id}`
    setTabs((prev) => [...prev, { id, name, content: '', modified: false }])
    setActiveTabId(id)
  }, [])

  const handleCloseTab = useCallback(
    (id) => {
      setTabs((prev) => {
        if (prev.length === 1) return prev
        const remaining = prev.filter((t) => t.id !== id)
        if (activeTabId === id) {
          const idx = prev.findIndex((t) => t.id === id)
          const next = remaining[Math.min(idx, remaining.length - 1)]
          setActiveTabId(next.id)
        }
        return remaining
      })
    },
    [activeTabId]
  )

  const handleContentChange = useCallback((content) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === activeTabId ? { ...t, content, modified: true } : t))
    )
  }, [activeTabId])

  const handleUndo = useCallback(() => document.execCommand('undo'), [])
  const handleRedo = useCallback(() => document.execCommand('redo'), [])
  const handleCut = useCallback(() => document.execCommand('cut'), [])
  const handleCopy = useCallback(() => document.execCommand('copy'), [])
  const handlePaste = useCallback(() => document.execCommand('paste'), [])

  const handleFindNext = useCallback((term, options) => {
    if (term !== undefined) {
      searchStateRef.current = { term, options }
    }
    const { term: t, options: o } = searchStateRef.current
    return t ? (editorRef.current?.findNext(t, o) ?? false) : false
  }, [])

  const handleFindPrev = useCallback((term, options) => {
    if (term !== undefined) {
      searchStateRef.current = { term, options }
    }
    const { term: t, options: o } = searchStateRef.current
    return t ? (editorRef.current?.findPrev(t, o) ?? false) : false
  }, [])

  const handleReplace = useCallback((term, replacement, options) => {
    searchStateRef.current = { term, options }
    editorRef.current?.replaceOne(term, replacement, options)
  }, [])

  const handleReplaceAll = useCallback((term, replacement, options) => {
    searchStateRef.current = { term, options }
    return editorRef.current?.replaceAll(term, replacement, options) ?? 0
  }, [])

  const handleSelectAndFindNext = useCallback(() => {
    const word = editorRef.current?.selectWordAtCursor()
    if (word) {
      const options = { matchCase: false, wholeWord: false, wrapAround: true }
      searchStateRef.current = { term: word, options }
      editorRef.current?.findNext(word, options)
    }
  }, [])

  const handleSelectAndFindPrev = useCallback(() => {
    const word = editorRef.current?.selectWordAtCursor()
    if (word) {
      const options = { matchCase: false, wholeWord: false, wrapAround: true }
      searchStateRef.current = { term: word, options }
      editorRef.current?.findPrev(word, options)
    }
  }, [])

  const handleMenuAction = useCallback((label) => {
    switch (label) {
      case 'Find...':
        setFindDialogMode('find')
        setFindDialogOpen(true)
        break
      case 'Find Next':
        handleFindNext()
        break
      case 'Find Previous':
        handleFindPrev()
        break
      case 'Select and Find Next':
        handleSelectAndFindNext()
        break
      case 'Select and Find Previous':
        handleSelectAndFindPrev()
        break
      case 'Replace...':
        setFindDialogMode('replace')
        setFindDialogOpen(true)
        break
      case 'Incremental Search':
        setIncrementalSearchOpen((v) => !v)
        break
      case 'Go to...':
        setGoToDialogOpen(true)
        break
      case 'Go to Matching Brace':
        editorRef.current?.goToMatchingBrace()
        break
      default:
        break
    }
  }, [handleFindNext, handleFindPrev, handleSelectAndFindNext, handleSelectAndFindPrev])

  useEffect(() => {
    const handleKeyDown = (e) => {
      const ctrl = e.ctrlKey || e.metaKey
      const shift = e.shiftKey
      const alt = e.altKey

      if (ctrl && !shift && !alt && e.key === 'f') {
        e.preventDefault()
        setFindDialogMode('find')
        setFindDialogOpen(true)
      } else if (ctrl && !shift && !alt && e.key === 'h') {
        e.preventDefault()
        setFindDialogMode('replace')
        setFindDialogOpen(true)
      } else if (!ctrl && !shift && !alt && e.key === 'F3') {
        e.preventDefault()
        handleFindNext()
      } else if (!ctrl && shift && !alt && e.key === 'F3') {
        e.preventDefault()
        handleFindPrev()
      } else if (ctrl && !shift && !alt && e.key === 'F3') {
        e.preventDefault()
        handleSelectAndFindNext()
      } else if (ctrl && shift && !alt && e.key === 'F3') {
        e.preventDefault()
        handleSelectAndFindPrev()
      } else if (ctrl && !shift && !alt && e.key === 'g') {
        e.preventDefault()
        setGoToDialogOpen(true)
      } else if (ctrl && !shift && !alt && e.key === 'b') {
        e.preventDefault()
        editorRef.current?.goToMatchingBrace()
      } else if (ctrl && !shift && alt && e.key === 'i') {
        e.preventDefault()
        setIncrementalSearchOpen((v) => !v)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleFindNext, handleFindPrev, handleSelectAndFindNext, handleSelectAndFindPrev])

  const handleIncrementalSearch = useCallback((term) => {
    if (!term) return true
    const options = { matchCase: false, wholeWord: false, wrapAround: true }
    searchStateRef.current = { term, options }
    return editorRef.current?.findNext(term, options) ?? false
  }, [])

  const handleIncrementalSearchNext = useCallback((term) => {
    if (!term) return true
    const { options } = searchStateRef.current
    searchStateRef.current = { term, options }
    return editorRef.current?.findNext(term, options) ?? false
  }, [])

  const handleIncrementalSearchPrev = useCallback((term) => {
    if (!term) return true
    const { options } = searchStateRef.current
    searchStateRef.current = { term, options }
    return editorRef.current?.findPrev(term, options) ?? false
  }, [])

  return (
    <div className={styles.app}>
      <MenuBar onNew={handleNewTab} onAction={handleMenuAction} />
      <Toolbar
        onNew={handleNewTab}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onCut={handleCut}
        onCopy={handleCopy}
        onPaste={handlePaste}
      />
      <TabBar
        tabs={tabs}
        activeTabId={activeTabId}
        onSelect={setActiveTabId}
        onClose={handleCloseTab}
      />
      <Editor
        ref={editorRef}
        content={activeTab?.content ?? ''}
        onChange={handleContentChange}
        onCursorChange={setCursorPos}
      />
      <IncrementalSearch
        isOpen={incrementalSearchOpen}
        onClose={() => { setIncrementalSearchOpen(false); editorRef.current?.focus() }}
        onSearch={handleIncrementalSearch}
        onSearchNext={handleIncrementalSearchNext}
        onSearchPrev={handleIncrementalSearchPrev}
      />
      <StatusBar cursorPos={cursorPos} eol="Windows (CR LF)" encoding="UTF-8" />
      <FindDialog
        isOpen={findDialogOpen}
        mode={findDialogMode}
        onClose={() => { setFindDialogOpen(false); editorRef.current?.focus() }}
        onFindNext={handleFindNext}
        onFindPrev={handleFindPrev}
        onReplace={handleReplace}
        onReplaceAll={handleReplaceAll}
      />
      <GoToDialog
        isOpen={goToDialogOpen}
        lineCount={lineCount}
        onClose={() => { setGoToDialogOpen(false); editorRef.current?.focus() }}
        onGoTo={(n) => editorRef.current?.goToLine(n)}
      />
    </div>
  )
}
