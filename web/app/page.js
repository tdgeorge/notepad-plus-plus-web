'use client'

import { useState, useCallback, useRef } from 'react'
import MenuBar from '../components/MenuBar'
import Toolbar from '../components/Toolbar'
import TabBar from '../components/TabBar'
import Editor from '../components/Editor'
import StatusBar from '../components/StatusBar'
import styles from './page.module.css'

let nextTabId = 2

export default function Home() {
  const [tabs, setTabs] = useState([{ id: 1, name: 'new 1', content: '', modified: false }])
  const [activeTabId, setActiveTabId] = useState(1)
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1, sel: 0 })
  const editorRef = useRef(null)

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

  const handleUndo = useCallback(() => editorRef.current?.undo(), [])
  const handleRedo = useCallback(() => editorRef.current?.redo(), [])
  const handleCut = useCallback(() => editorRef.current?.cut(), [])
  const handleCopy = useCallback(() => editorRef.current?.copy(), [])
  const handlePaste = useCallback(() => editorRef.current?.paste(), [])

  const handleEditAction = useCallback((action) => {
    editorRef.current?.[action]?.()
  }, [])

  return (
    <div className={styles.app}>
      <MenuBar onNew={handleNewTab} onEditAction={handleEditAction} />
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
      <StatusBar cursorPos={cursorPos} eol="Windows (CR LF)" encoding="UTF-8" />
    </div>
  )
}
