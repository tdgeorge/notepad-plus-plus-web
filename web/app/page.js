'use client'

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import MenuBar from '../components/MenuBar'
import Toolbar from '../components/Toolbar'
import TabBar from '../components/TabBar'
import Editor from '../components/Editor'
import StatusBar from '../components/StatusBar'
import FindDialog from '../components/FindDialog'
import GoToDialog from '../components/GoToDialog'
import IncrementalSearch from '../components/IncrementalSearch'
import AboutDialog from '../components/AboutDialog'
import StyleConfiguratorDialog from '../components/StyleConfiguratorDialog'
import { applyTheme, DEFAULT_THEME_ID } from '../lib/themes'
import { detectLanguage } from '../lib/languages/index'
import styles from './page.module.css'

const DEFAULT_FONT_SIZE = 13
const MIN_FONT_SIZE = 6
const MAX_FONT_SIZE = 32

let nextTabId = 2

export default function Home() {
  const [tabs, setTabs] = useState([{ id: 1, name: 'new 1', content: '', modified: false }])
  const [activeTabId, setActiveTabId] = useState(1)
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1, sel: 0 })
  const editorRef = useRef(null)
  const [fileHandles, setFileHandles] = useState({})

  const [wordWrap, setWordWrap] = useState(false)
  const [fontSize, setFontSize] = useState(DEFAULT_FONT_SIZE)
  const [showWhitespace, setShowWhitespace] = useState(false)
  const [showEol, setShowEol] = useState(false)
  const [showAllChars, setShowAllChars] = useState(false)
  const [showIndent, setShowIndent] = useState(false)

  // Search state
  const [findDialogOpen, setFindDialogOpen] = useState(false)
  const [findDialogMode, setFindDialogMode] = useState('find')
  const [goToDialogOpen, setGoToDialogOpen] = useState(false)
  const [incrementalSearchOpen, setIncrementalSearchOpen] = useState(false)
  const [aboutDialogOpen, setAboutDialogOpen] = useState(false)
  const [styleConfiguratorOpen, setStyleConfiguratorOpen] = useState(false)
  const [themeId, setThemeId] = useState(DEFAULT_THEME_ID)
  const searchStateRef = useRef({ term: '', options: { matchCase: false, wholeWord: false, wrapAround: true } })

  // Load persisted theme on mount and apply it
  useEffect(() => {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('nppw-theme') : null
    const id = saved ?? DEFAULT_THEME_ID
    setThemeId(id)
    applyTheme(id)
  }, [])

  // Apply theme whenever it changes
  useEffect(() => {
    applyTheme(themeId)
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('nppw-theme', themeId)
    }
  }, [themeId])

  const activeTabIdRef = useRef(activeTabId)
  useEffect(() => { activeTabIdRef.current = activeTabId }, [activeTabId])

  const tabsRef = useRef(tabs)
  useEffect(() => { tabsRef.current = tabs }, [tabs])

  const fileHandlesRef = useRef(fileHandles)
  useEffect(() => { fileHandlesRef.current = fileHandles }, [fileHandles])

  const activeTab = tabs.find((t) => t.id === activeTabId)
  const lineCount = useMemo(
    () => (activeTab?.content ?? '').split('\n').length,
    [activeTab?.content]
  )
  // Language is stored per-tab (set at file-open time or overridden via Language menu).
  const language = activeTab?.language ?? null

  const viewState = { wordWrap, showWhitespace, showEol, showAllChars, showIndent, language }

  const handleNewTab = useCallback(() => {
    const id = nextTabId++
    const name = `new ${id}`
    setTabs((prev) => [...prev, { id, name, content: '', modified: false, language: null }])
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
      setFileHandles((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
    },
    [activeTabId]
  )

  const handleContentChange = useCallback((content) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === activeTabIdRef.current ? { ...t, content, modified: true } : t))
    )
  }, [])

  const handleUndo = useCallback(() => editorRef.current?.undo(), [])
  const handleRedo = useCallback(() => editorRef.current?.redo(), [])
  const handleCut = useCallback(() => editorRef.current?.cut(), [])
  const handleCopy = useCallback(() => editorRef.current?.copy(), [])
  const handlePaste = useCallback(() => editorRef.current?.paste(), [])

  const handleEditAction = useCallback((action) => {
    editorRef.current?.[action]?.()
  }, [])

  const downloadFile = useCallback((name, content) => {
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  const writeToHandle = useCallback(async (handle, content) => {
    const writable = await handle.createWritable()
    await writable.write(content)
    await writable.close()
  }, [])

  const handleOpen = useCallback(async () => {
    if (typeof window.showOpenFilePicker === 'function') {
      try {
        const handles = await window.showOpenFilePicker({ multiple: true })
        for (const handle of handles) {
          const file = await handle.getFile()
          const content = await file.text()
          const id = nextTabId++
          setTabs((prev) => [...prev, { id, name: file.name, content, modified: false, language: detectLanguage(file.name) }])
          setFileHandles((prev) => ({ ...prev, [id]: handle }))
          setActiveTabId(id)
        }
      } catch (e) {
        if (e.name !== 'AbortError') console.error(e)
      }
    } else {
      const input = document.createElement('input')
      input.type = 'file'
      input.multiple = true
      input.onchange = async (e) => {
        for (const file of Array.from(e.target.files)) {
          const content = await file.text()
          const id = nextTabId++
          setTabs((prev) => [...prev, { id, name: file.name, content, modified: false, language: detectLanguage(file.name) }])
          setActiveTabId(id)
        }
      }
      input.click()
    }
  }, [])

  const handleSaveAs = useCallback(async () => {
    const tab = tabsRef.current.find((t) => t.id === activeTabIdRef.current)
    if (!tab) return
    if (typeof window.showSaveFilePicker === 'function') {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: tab.name,
          types: [{ description: 'Text files', accept: { 'text/plain': ['.txt', '.md', '.js', '.ts', '.css', '.html', '.json', '.xml', '.csv'] } }],
        })
        await writeToHandle(handle, tab.content)
        const savedFile = await handle.getFile()
        setFileHandles((prev) => ({ ...prev, [tab.id]: handle }))
        setTabs((prev) =>
          prev.map((t) => (t.id === tab.id ? { ...t, name: savedFile.name, modified: false } : t))
        )
      } catch (e) {
        if (e.name !== 'AbortError') console.error(e)
      }
    } else {
      downloadFile(tab.name, tab.content)
      setTabs((prev) =>
        prev.map((t) => (t.id === tab.id ? { ...t, modified: false } : t))
      )
    }
  }, [downloadFile, writeToHandle])

  const handleSave = useCallback(async () => {
    const tab = tabsRef.current.find((t) => t.id === activeTabIdRef.current)
    if (!tab) return
    const handle = fileHandlesRef.current[tab.id]
    if (handle) {
      try {
        await writeToHandle(handle, tab.content)
        setTabs((prev) =>
          prev.map((t) => (t.id === tab.id ? { ...t, modified: false } : t))
        )
      } catch (e) {
        console.error(e)
      }
    } else {
      await handleSaveAs()
    }
  }, [handleSaveAs, writeToHandle])

  const handleSaveCopyAs = useCallback(async () => {
    const tab = tabsRef.current.find((t) => t.id === activeTabIdRef.current)
    if (!tab) return
    if (typeof window.showSaveFilePicker === 'function') {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: tab.name,
          types: [{ description: 'Text files', accept: { 'text/plain': ['.txt', '.md', '.js', '.ts', '.css', '.html', '.json', '.xml', '.csv'] } }],
        })
        await writeToHandle(handle, tab.content)
      } catch (e) {
        if (e.name !== 'AbortError') console.error(e)
      }
    } else {
      downloadFile(tab.name, tab.content)
    }
  }, [downloadFile, writeToHandle])

  const handleSaveAll = useCallback(async () => {
    const currentTabs = tabsRef.current
    const currentHandles = fileHandlesRef.current
    for (const tab of currentTabs) {
      if (!tab.modified) continue
      const handle = currentHandles[tab.id]
      if (handle) {
        try {
          await writeToHandle(handle, tab.content)
          setTabs((prev) =>
            prev.map((t) => (t.id === tab.id ? { ...t, modified: false } : t))
          )
        } catch (e) {
          console.error(e)
        }
      } else {
        downloadFile(tab.name, tab.content)
        setTabs((prev) =>
          prev.map((t) => (t.id === tab.id ? { ...t, modified: false } : t))
        )
      }
    }
  }, [downloadFile, writeToHandle])

  const handleReload = useCallback(async () => {
    const tab = tabsRef.current.find((t) => t.id === activeTabIdRef.current)
    if (!tab) return
    const handle = fileHandlesRef.current[tab.id]
    if (!handle) return
    try {
      const file = await handle.getFile()
      const content = await file.text()
      setTabs((prev) =>
        prev.map((t) => (t.id === tab.id ? { ...t, content, modified: false } : t))
      )
    } catch (e) {
      console.error(e)
    }
  }, [])

  const handleRename = useCallback(() => {
    const tab = tabsRef.current.find((t) => t.id === activeTabIdRef.current)
    if (!tab) return
    const newName = window.prompt('Enter new file name:', tab.name)
    if (newName && newName.trim()) {
      setTabs((prev) =>
        prev.map((t) => (t.id === tab.id ? { ...t, name: newName.trim() } : t))
      )
    }
  }, [])

  const handleCloseActive = useCallback(() => {
    handleCloseTab(activeTabIdRef.current)
  }, [handleCloseTab])

  const handlePrint = useCallback(() => {
    window.print()
  }, [])

  const handleNewWindow = useCallback(() => {
    window.open(window.location.href, '_blank')
  }, [])

  const handleExit = useCallback(() => {
    window.close()
  }, [])

  const handleFileAction = useCallback(
    (action) => {
      switch (action) {
        case 'new': handleNewTab(); break
        case 'newWindow': handleNewWindow(); break
        case 'open': handleOpen(); break
        case 'reload': handleReload(); break
        case 'save': handleSave(); break
        case 'saveAs': handleSaveAs(); break
        case 'saveCopyAs': handleSaveCopyAs(); break
        case 'saveAll': handleSaveAll(); break
        case 'rename': handleRename(); break
        case 'closeActive': handleCloseActive(); break
        case 'print': handlePrint(); break
        case 'exit': handleExit(); break
        case 'about': setAboutDialogOpen(true); break
        case 'styleConfigurator': setStyleConfiguratorOpen(true); break
        default: break
      }
    },
    [
      handleNewTab, handleNewWindow, handleOpen, handleReload, handleSave,
      handleSaveAs, handleSaveCopyAs, handleSaveAll, handleRename,
      handleCloseActive, handlePrint, handleExit,
    ]
  )

  const handleZoomIn = useCallback(() => setFontSize((prev) => Math.min(prev + 1, MAX_FONT_SIZE)), [])
  const handleZoomOut = useCallback(() => setFontSize((prev) => Math.max(prev - 1, MIN_FONT_SIZE)), [])
  const handleZoomReset = useCallback(() => setFontSize(DEFAULT_FONT_SIZE), [])

  const handleViewAction = useCallback((action) => {
    switch (action) {
      case 'word-wrap':
        setWordWrap((prev) => !prev)
        break
      case 'zoom-in':
        handleZoomIn()
        break
      case 'zoom-out':
        handleZoomOut()
        break
      case 'zoom-reset':
        handleZoomReset()
        break
      case 'fullscreen':
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen?.()
        } else {
          document.exitFullscreen?.()
        }
        break
      case 'show-whitespace':
        setShowWhitespace((prev) => !prev)
        break
      case 'show-eol':
        setShowEol((prev) => !prev)
        break
      case 'show-all-chars':
        setShowAllChars((prev) => {
          const next = !prev
          setShowWhitespace(next)
          setShowEol(next)
          return next
        })
        break
      case 'show-indent':
        setShowIndent((prev) => !prev)
        break
      default:
        break
    }
  }, [handleZoomIn, handleZoomOut, handleZoomReset])

  const handleLanguageAction = useCallback((action) => {
    const tabId = activeTabIdRef.current
    if (action === 'lang-plain-text') {
      setTabs((prev) => prev.map((t) => (t.id === tabId ? { ...t, language: null } : t)))
    } else if (action.startsWith('lang-')) {
      const langId = action.slice(5)
      setTabs((prev) => prev.map((t) => (t.id === tabId ? { ...t, language: langId } : t)))
    }
  }, [])

  // Search handlers
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

  const handleSearchAction = useCallback((action) => {
    switch (action) {
      case 'find':
        setFindDialogMode('find')
        setFindDialogOpen(true)
        break
      case 'findNext':
        handleFindNext()
        break
      case 'findPrev':
        handleFindPrev()
        break
      case 'selectFindNext':
        handleSelectAndFindNext()
        break
      case 'selectFindPrev':
        handleSelectAndFindPrev()
        break
      case 'replace':
        setFindDialogMode('replace')
        setFindDialogOpen(true)
        break
      case 'incrementalSearch':
        setIncrementalSearchOpen((v) => !v)
        break
      case 'goTo':
        setGoToDialogOpen(true)
        break
      case 'goToMatchingBrace':
        editorRef.current?.goToMatchingBrace()
        break
      default:
        break
    }
  }, [handleFindNext, handleFindPrev, handleSelectAndFindNext, handleSelectAndFindPrev])

  // Global keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e) => {
      const ctrl = e.ctrlKey || e.metaKey
      const key = e.key.toLowerCase()
      if (ctrl && !e.shiftKey && !e.altKey && key === 'n') {
        e.preventDefault()
        handleNewTab()
      } else if (ctrl && e.shiftKey && !e.altKey && key === 'n') {
        e.preventDefault()
        handleNewWindow()
      } else if (ctrl && !e.shiftKey && !e.altKey && key === 'o') {
        e.preventDefault()
        handleOpen()
      } else if (ctrl && !e.shiftKey && !e.altKey && key === 's') {
        e.preventDefault()
        handleSave()
      } else if (ctrl && e.altKey && !e.shiftKey && key === 's') {
        e.preventDefault()
        handleSaveAs()
      } else if (ctrl && e.shiftKey && !e.altKey && key === 's') {
        e.preventDefault()
        handleSaveAll()
      } else if (ctrl && !e.shiftKey && !e.altKey && key === 'p') {
        e.preventDefault()
        handlePrint()
      } else if (e.altKey && e.code === 'KeyW') {
        e.preventDefault()
        setWordWrap((prev) => !prev)
      } else if (e.key === 'F11') {
        e.preventDefault()
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen?.()
        } else {
          document.exitFullscreen?.()
        }
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [handleNewTab, handleNewWindow, handleOpen, handleSave, handleSaveAs, handleSaveAll, handlePrint])

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

  // Incremental search handlers - pass noFocus so the search input keeps focus
  const handleIncrementalSearch = useCallback((term) => {
    if (!term) return true
    const options = { matchCase: false, wholeWord: false, wrapAround: true, noFocus: true }
    searchStateRef.current = { term, options }
    return editorRef.current?.findNext(term, options) ?? false
  }, [])

  const handleIncrementalSearchNext = useCallback((term) => {
    if (!term) return true
    const options = { ...searchStateRef.current.options, noFocus: true }
    searchStateRef.current = { term, options }
    return editorRef.current?.findNext(term, options) ?? false
  }, [])

  const handleIncrementalSearchPrev = useCallback((term) => {
    if (!term) return true
    const options = { ...searchStateRef.current.options, noFocus: true }
    searchStateRef.current = { term, options }
    return editorRef.current?.findPrev(term, options) ?? false
  }, [])

  return (
    <div className={styles.app}>
      <MenuBar
        onFileAction={handleFileAction}
        onEditAction={handleEditAction}
        onViewAction={handleViewAction}
        onSearchAction={handleSearchAction}
        onLanguageAction={handleLanguageAction}
        viewState={viewState}
      />
      <Toolbar
        onNew={handleNewTab}
        onOpen={handleOpen}
        onSave={handleSave}
        onSaveAll={handleSaveAll}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onCut={handleCut}
        onCopy={handleCopy}
        onPaste={handlePaste}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onZoomReset={handleZoomReset}
      />
      <TabBar
        tabs={tabs}
        activeTabId={activeTabId}
        onSelect={setActiveTabId}
        onClose={handleCloseTab}
      />
      <IncrementalSearch
        isOpen={incrementalSearchOpen}
        onClose={() => { setIncrementalSearchOpen(false); editorRef.current?.focus() }}
        onSearch={handleIncrementalSearch}
        onSearchNext={handleIncrementalSearchNext}
        onSearchPrev={handleIncrementalSearchPrev}
      />
      <Editor
        ref={editorRef}
        content={activeTab?.content ?? ''}
        onChange={handleContentChange}
        onCursorChange={setCursorPos}
        wordWrap={wordWrap}
        fontSize={fontSize}
        showWhitespace={showWhitespace}
        showEol={showEol}
        showIndent={showIndent}
        language={language}
      />
      <StatusBar cursorPos={cursorPos} eol="Windows (CR LF)" encoding="UTF-8" language={language} />
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
      <AboutDialog
        isOpen={aboutDialogOpen}
        onClose={() => setAboutDialogOpen(false)}
      />
      <StyleConfiguratorDialog
        isOpen={styleConfiguratorOpen}
        currentThemeId={themeId}
        onApply={(id) => setThemeId(id)}
        onClose={() => setStyleConfiguratorOpen(false)}
      />
    </div>
  )
}
