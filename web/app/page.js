'use client'

import { useState, useCallback, useEffect } from 'react'
import MenuBar from '../components/MenuBar'
import Toolbar from '../components/Toolbar'
import TabBar from '../components/TabBar'
import Editor from '../components/Editor'
import StatusBar from '../components/StatusBar'
import styles from './page.module.css'

const DEFAULT_FONT_SIZE = 13
const MIN_FONT_SIZE = 6
const MAX_FONT_SIZE = 32

let nextTabId = 2

export default function Home() {
  const [tabs, setTabs] = useState([{ id: 1, name: 'new 1', content: '', modified: false }])
  const [activeTabId, setActiveTabId] = useState(1)
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1, sel: 0 })
  const [wordWrap, setWordWrap] = useState(false)
  const [fontSize, setFontSize] = useState(DEFAULT_FONT_SIZE)
  const [showWhitespace, setShowWhitespace] = useState(false)
  const [showEol, setShowEol] = useState(false)
  const [showAllChars, setShowAllChars] = useState(false)
  const [showIndent, setShowIndent] = useState(false)

  const viewState = { wordWrap, showWhitespace, showEol, showAllChars, showIndent }

  const activeTab = tabs.find((t) => t.id === activeTabId)

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

  const handleZoomIn = useCallback(() => setFontSize((prev) => Math.min(prev + 1, MAX_FONT_SIZE)), [])
  const handleZoomOut = useCallback(() => setFontSize((prev) => Math.max(prev - 1, MIN_FONT_SIZE)), [])
  const handleZoomReset = useCallback(() => setFontSize(DEFAULT_FONT_SIZE), [])

  const handleMenuAction = useCallback((action) => {
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

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.altKey && e.key === 'w') {
        e.preventDefault()
        setWordWrap((prev) => !prev)
      }
      if (e.key === 'F11') {
        e.preventDefault()
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen?.()
        } else {
          document.exitFullscreen?.()
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className={styles.app}>
      <MenuBar onNew={handleNewTab} onAction={handleMenuAction} viewState={viewState} />
      <Toolbar
        onNew={handleNewTab}
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
      <Editor
        content={activeTab?.content ?? ''}
        onChange={handleContentChange}
        onCursorChange={setCursorPos}
        wordWrap={wordWrap}
        fontSize={fontSize}
      />
      <StatusBar cursorPos={cursorPos} eol="Windows (CR LF)" encoding="UTF-8" />
    </div>
  )
}
