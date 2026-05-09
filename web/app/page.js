'use client'

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import MenuBar from '../components/MenuBar'
import Toolbar from '../components/Toolbar'
import TabBar from '../components/TabBar'
import Editor from '../components/Editor'
import SplitPane from '../components/SplitPane'
import StatusBar from '../components/StatusBar'
import FindDialog from '../components/FindDialog'
import GoToDialog from '../components/GoToDialog'
import IncrementalSearch from '../components/IncrementalSearch'
import AboutDialog from '../components/AboutDialog'
import StyleConfiguratorDialog from '../components/StyleConfiguratorDialog'
import ToolsHashDialog from '../components/ToolsHashDialog'
import ToolsRandomDialog from '../components/ToolsRandomDialog'
import WindowsDialog from '../components/WindowsDialog'
import { md5 } from '../lib/md5'
import { applyTheme, THEMES, DEFAULT_THEME_ID } from '../lib/themes'
import { detectLanguage } from '../lib/languages/index'
import styles from './page.module.css'

const DEFAULT_FONT_SIZE = 13
const MIN_FONT_SIZE = 6
const MAX_FONT_SIZE = 32
const INITIAL_TAB_NAME = 'new 1'
const INITIAL_TAB = { id: 1, name: INITIAL_TAB_NAME, content: '', modified: false }

// Cap the undo stack for large files to avoid unbounded memory growth.
// Each entry stores a full copy of the document content.
const LARGE_FILE_THRESHOLD = 100_000 // ~100 KB of text
const MAX_UNDO_LARGE_FILE = 20
const MACROS_STORAGE_KEY = 'nppw-macros'
const MAX_RECORDED_MACRO_STEPS = 5000
const getInsertedText = (before, after) => {
  if (typeof before !== 'string' || typeof after !== 'string') return null
  if (after.length <= before.length) return null

  let start = 0
  while (start < before.length && start < after.length && before[start] === after[start]) start++

  let beforeEnd = before.length - 1
  let afterEnd = after.length - 1
  while (beforeEnd >= start && afterEnd >= start && before[beforeEnd] === after[afterEnd]) {
    beforeEnd--
    afterEnd--
  }

  const removedLength = beforeEnd - start + 1
  if (removedLength !== 0) return null
  const insertedText = after.slice(start, afterEnd + 1)
  return insertedText.length > 0 ? insertedText : null
}

/**
 * Push `content` onto the undo history for `tabId`, capping the stack for
 * large files so memory usage stays bounded.
 */
function pushUndoEntry(undoHistoryRef, tabId, content) {
  const history = undoHistoryRef.current[tabId]
  if (!history) return
  const newStack = history.stack.slice(0, history.index + 1)
  newStack.push(content)
  if (content.length > LARGE_FILE_THRESHOLD && newStack.length > MAX_UNDO_LARGE_FILE) {
    const removed = newStack.splice(0, newStack.length - MAX_UNDO_LARGE_FILE)
    history.savedIndex = history.savedIndex >= removed.length
      ? history.savedIndex - removed.length
      : -1 // saved state was trimmed away; treat file as always-modified
  }
  history.stack = newStack
  history.index = newStack.length - 1
}

function formatCustomDateTime(value) {
  const pad = (part) => String(part).padStart(2, '0')
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())} ${pad(value.getHours())}:${pad(value.getMinutes())}:${pad(value.getSeconds())}`
}

let nextTabId = 2

export default function Home() {
  const [tabs, setTabs] = useState([INITIAL_TAB])
  const [activeTabId, setActiveTabId] = useState(1)
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1, sel: 0 })
  const editorRef = useRef(null)
  const [fileHandles, setFileHandles] = useState({})

  // ── Split-view state ──────────────────────────────────────────────────────
  const [splitEnabled, setSplitEnabled] = useState(false)
  const [splitRatio, setSplitRatio] = useState(0.5)
  const [view2Tabs, setView2Tabs] = useState([])
  const [view2ActiveTabId, setView2ActiveTabId] = useState(null)
  const [view2CursorPos, setView2CursorPos] = useState({ line: 1, col: 1, sel: 0 })
  const [activeView, setActiveView] = useState(1) // 1 or 2
  const secondEditorRef = useRef(null)

  const view2TabsRef = useRef(view2Tabs)
  useEffect(() => { view2TabsRef.current = view2Tabs }, [view2Tabs])

  const view2ActiveTabIdRef = useRef(view2ActiveTabId)
  useEffect(() => { view2ActiveTabIdRef.current = view2ActiveTabId }, [view2ActiveTabId])

  // Per-tab undo/redo history: { [tabId]: { stack: string[], index: number, savedIndex: number } }
  const undoHistoryRef = useRef({ 1: { stack: [''], index: 0, savedIndex: 0 } })

  const [wordWrap, setWordWrap] = useState(false)
  const [fontSize, setFontSize] = useState(DEFAULT_FONT_SIZE)
  const [showWhitespace, setShowWhitespace] = useState(false)
  const [showEol, setShowEol] = useState(false)
  const [showAllChars, setShowAllChars] = useState(false)
  const [showIndent, setShowIndent] = useState(false)
  const [distractionFree, setDistractionFree] = useState(false)
  const [syncScrollV, setSyncScrollV] = useState(false)
  const [syncScrollH, setSyncScrollH] = useState(false)
  const [textDirection, setTextDirection] = useState('ltr')

  // Search state
  const [findDialogOpen, setFindDialogOpen] = useState(false)
  const [findDialogMode, setFindDialogMode] = useState('find')
  const [goToDialogOpen, setGoToDialogOpen] = useState(false)
  const [incrementalSearchOpen, setIncrementalSearchOpen] = useState(false)
  const [aboutDialogOpen, setAboutDialogOpen] = useState(false)
  const [styleConfiguratorOpen, setStyleConfiguratorOpen] = useState(false)
  const [toolsHashDialogOpen, setToolsHashDialogOpen] = useState(false)
  const [toolsHashAlgorithm, setToolsHashAlgorithm] = useState('MD5')
  const [toolsHashInitialText, setToolsHashInitialText] = useState('')
  const [toolsRandomDialogOpen, setToolsRandomDialogOpen] = useState(false)
  const [themeId, setThemeId] = useState(DEFAULT_THEME_ID)
  const [windowsDialogOpen, setWindowsDialogOpen] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const [isRecordingMacro, setIsRecordingMacro] = useState(false)
  const [currentMacroSteps, setCurrentMacroSteps] = useState([])
  const [hasStoppedRecordingMacro, setHasStoppedRecordingMacro] = useState(false)
  const [savedMacros, setSavedMacros] = useState([])
  const searchStateRef = useRef({ term: '', options: { matchCase: false, wholeWord: false, wrapAround: true } })
  // Guard flag prevents the two editors from triggering each other's scroll endlessly.
  const syncScrollingRef = useRef(false)
  const isRecordingMacroRef = useRef(isRecordingMacro)
  const currentMacroStepsRef = useRef(currentMacroSteps)
  const hasStoppedRecordingMacroRef = useRef(hasStoppedRecordingMacro)
  const savedMacrosRef = useRef(savedMacros)
  const isPlayingBackMacroRef = useRef(false)

  useEffect(() => { isRecordingMacroRef.current = isRecordingMacro }, [isRecordingMacro])
  useEffect(() => { currentMacroStepsRef.current = currentMacroSteps }, [currentMacroSteps])
  useEffect(() => { hasStoppedRecordingMacroRef.current = hasStoppedRecordingMacro }, [hasStoppedRecordingMacro])
  useEffect(() => { savedMacrosRef.current = savedMacros }, [savedMacros])

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

  useEffect(() => {
    if (typeof localStorage === 'undefined') return
    const raw = localStorage.getItem(MACROS_STORAGE_KEY)
    if (!raw) return
    try {
      const parsed = JSON.parse(raw)
      if (!Array.isArray(parsed)) return
      const normalized = parsed
        .filter((item) => typeof item?.name === 'string' && Array.isArray(item?.steps))
        .map((item) => ({
          name: item.name,
          steps: item.steps.filter((step) => typeof step?.menu === 'string' && typeof step?.action === 'string'),
        }))
      setSavedMacros(normalized)
    } catch {
      // Ignore invalid saved macro data
    }
  }, [])

  useEffect(() => {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(MACROS_STORAGE_KEY, JSON.stringify(savedMacros))
  }, [savedMacros])

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

  const viewState = { wordWrap, showWhitespace, showEol, showAllChars, showIndent, language, splitEnabled, distractionFree, syncScrollV, syncScrollH, textDirection }

  const activeTabIndex = tabs.findIndex((t) => t.id === activeTabId)
  const fileState = {
    hasFileHandle: Boolean(fileHandles[activeTabId]),
    tabCount: tabs.length,
    activeTabIndex,
  }
  const macroState = {
    isRecording: isRecordingMacro,
    hasCurrentMacro: hasStoppedRecordingMacro || currentMacroSteps.length > 0,
    hasRunnableMacro: hasStoppedRecordingMacro || currentMacroSteps.length > 0 || savedMacros.length > 0,
  }
  // ── Active editor helper ──────────────────────────────────────────────────
  // Returns the ref for whichever view is currently active.
  const getActiveEditor = useCallback(
    () => (activeView === 1 ? editorRef.current : secondEditorRef.current),
    [activeView]
  )

  const getActiveTabRecord = useCallback(() => {
    const currentTabId = activeView === 1 ? activeTabIdRef.current : view2ActiveTabIdRef.current
    const currentTabs = activeView === 1 ? tabsRef.current : view2TabsRef.current
    return currentTabs.find((tab) => tab.id === currentTabId) ?? null
  }, [activeView])

  const getAllOpenTabs = useCallback(
    () => [...tabsRef.current, ...view2TabsRef.current],
    []
  )

  const handleNewTab = useCallback(() => {
    const id = nextTabId++
    const name = `new ${id}`
    undoHistoryRef.current[id] = { stack: [''], index: 0, savedIndex: 0 }
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
      delete undoHistoryRef.current[id]
    },
    [activeTabId]
  )

  // ── View-2 tab management ─────────────────────────────────────────────────
  const handleCloseView2Tab = useCallback(
    (id) => {
      setView2Tabs((prev) => {
        const remaining = prev.filter((t) => t.id !== id)
        if (remaining.length === 0) {
          setSplitEnabled(false)
          setActiveView(1)
        } else if (view2ActiveTabIdRef.current === id) {
          const idx = prev.findIndex((t) => t.id === id)
          setView2ActiveTabId(remaining[Math.min(idx, remaining.length - 1)].id)
        }
        return remaining
      })
      setFileHandles((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
    },
    []
  )

  const handleUndo = useCallback(() => {
    const isView1 = activeView === 1
    const tabId = isView1 ? activeTabIdRef.current : view2ActiveTabIdRef.current
    const history = undoHistoryRef.current[tabId]
    if (!history || history.index <= 0) return
    history.index--
    const content = history.stack[history.index]
    const modified = history.index !== history.savedIndex
    if (isView1) {
      setTabs((prev) =>
        prev.map((t) => (t.id === tabId ? { ...t, content, modified } : t))
      )
    } else {
      setView2Tabs((prev) =>
        prev.map((t) => (t.id === tabId ? { ...t, content, modified } : t))
      )
    }
  }, [activeView])

  const handleRedo = useCallback(() => {
    const isView1 = activeView === 1
    const tabId = isView1 ? activeTabIdRef.current : view2ActiveTabIdRef.current
    const history = undoHistoryRef.current[tabId]
    if (!history || history.index >= history.stack.length - 1) return
    history.index++
    const content = history.stack[history.index]
    const modified = history.index !== history.savedIndex
    if (isView1) {
      setTabs((prev) =>
        prev.map((t) => (t.id === tabId ? { ...t, content, modified } : t))
      )
    } else {
      setView2Tabs((prev) =>
        prev.map((t) => (t.id === tabId ? { ...t, content, modified } : t))
      )
    }
  }, [activeView])

  const handleEditAction = useCallback((action) => {
    if (action === 'copy-filename') {
      const tab = getActiveTabRecord()
      const filename = tab?.name ?? ''
      navigator.clipboard?.writeText(filename).catch(() => {})
      return
    }
    if (action === 'copy-all-names') {
      const names = getAllOpenTabs().map((t) => t.name).join('\n')
      navigator.clipboard?.writeText(names).catch(() => {})
      return
    }
    if (action === 'insert-datetime-short') {
      const now = new Date()
      const text = now.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
      getActiveEditor()?.insertText?.(text)
      return
    }
    if (action === 'insert-datetime-long') {
      const now = new Date()
      const text = now.toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'long' })
      getActiveEditor()?.insertText?.(text)
      return
    }
    if (action === 'insert-datetime-custom') {
      getActiveEditor()?.insertText?.(formatCustomDateTime(new Date()))
      return
    }
    getActiveEditor()?.[action]?.()
  }, [getActiveEditor, getActiveTabRecord, getAllOpenTabs])

  const recordMacroStep = useCallback((menu, action, extra = null) => {
    if (!isRecordingMacroRef.current || isPlayingBackMacroRef.current) return
    if (!menu || !action) return
    const payload = (extra && typeof extra === 'object') ? extra : {}
    setCurrentMacroSteps((prev) => {
      if (prev.length >= MAX_RECORDED_MACRO_STEPS) return prev
      return [...prev, { menu, action, ...payload }]
    })
  }, [])

  const handleContentChange = useCallback((content) => {
    const tabId = activeTabIdRef.current
    const previousContent = tabsRef.current.find((t) => t.id === tabId)?.content ?? ''
    const insertedText = getInsertedText(previousContent, content)
    if (insertedText) {
      recordMacroStep('Macro', 'insert-text', { text: insertedText })
    }
    pushUndoEntry(undoHistoryRef, tabId, content)
    setTabs((prev) =>
      prev.map((t) => (t.id === tabId ? { ...t, content, modified: true } : t))
    )
  }, [recordMacroStep])

  const handleView2ContentChange = useCallback((content) => {
    const tabId = view2ActiveTabIdRef.current
    const previousContent = view2TabsRef.current.find((t) => t.id === tabId)?.content ?? ''
    const insertedText = getInsertedText(previousContent, content)
    if (insertedText) {
      recordMacroStep('Macro', 'insert-text', { text: insertedText })
    }
    pushUndoEntry(undoHistoryRef, tabId, content)
    setView2Tabs((prev) =>
      prev.map((t) => (t.id === tabId ? { ...t, content, modified: true } : t))
    )
  }, [recordMacroStep])

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
          undoHistoryRef.current[id] = { stack: [content], index: 0, savedIndex: 0 }
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
          undoHistoryRef.current[id] = { stack: [content], index: 0, savedIndex: 0 }
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
        const history = undoHistoryRef.current[tab.id]
        if (history) history.savedIndex = history.index
        setTabs((prev) =>
          prev.map((t) => (t.id === tab.id ? { ...t, name: savedFile.name, modified: false } : t))
        )
      } catch (e) {
        if (e.name !== 'AbortError') console.error(e)
      }
    } else {
      downloadFile(tab.name, tab.content)
      const history = undoHistoryRef.current[tab.id]
      if (history) history.savedIndex = history.index
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
        const history = undoHistoryRef.current[tab.id]
        if (history) history.savedIndex = history.index
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
          const history = undoHistoryRef.current[tab.id]
          if (history) history.savedIndex = history.index
          setTabs((prev) =>
            prev.map((t) => (t.id === tab.id ? { ...t, modified: false } : t))
          )
        } catch (e) {
          console.error(e)
        }
      } else {
        downloadFile(tab.name, tab.content)
        const history = undoHistoryRef.current[tab.id]
        if (history) history.savedIndex = history.index
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
      undoHistoryRef.current[tab.id] = { stack: [content], index: 0, savedIndex: 0 }
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

  const handleCloseAll = useCallback(() => {
    const newId = nextTabId++
    undoHistoryRef.current = { [newId]: { stack: [''], index: 0, savedIndex: 0 } }
    setTabs([{ id: newId, name: `new ${newId}`, content: '', modified: false }])
    setActiveTabId(newId)
    if (splitEnabled) {
      setSplitEnabled(false)
      setView2Tabs([])
      setView2ActiveTabId(null)
      setActiveView(1)
    }
  }, [splitEnabled])

  const handleCloseAllButActive = useCallback(() => {
    setTabs((prev) => {
      const active = prev.find((t) => t.id === activeTabIdRef.current)
      if (!active) return prev
      const toRemove = prev.filter((t) => t.id !== active.id)
      toRemove.forEach((t) => { delete undoHistoryRef.current[t.id] })
      return [active]
    })
  }, [])

  const handleCloseAllToLeft = useCallback(() => {
    setTabs((prev) => {
      const idx = prev.findIndex((t) => t.id === activeTabIdRef.current)
      if (idx <= 0) return prev
      const toRemove = prev.slice(0, idx)
      toRemove.forEach((t) => { delete undoHistoryRef.current[t.id] })
      return prev.slice(idx)
    })
  }, [])

  const handleCloseAllToRight = useCallback(() => {
    setTabs((prev) => {
      const idx = prev.findIndex((t) => t.id === activeTabIdRef.current)
      if (idx === -1 || idx === prev.length - 1) return prev
      const toRemove = prev.slice(idx + 1)
      toRemove.forEach((t) => { delete undoHistoryRef.current[t.id] })
      return prev.slice(0, idx + 1)
    })
  }, [])

  const handleCloseAllUnchanged = useCallback(() => {
    setTabs((prev) => {
      const remaining = prev.filter((t) => t.modified)
      if (remaining.length === 0) {
        const newId = nextTabId++
        undoHistoryRef.current[newId] = { stack: [''], index: 0, savedIndex: 0 }
        const toRemove = prev
        toRemove.forEach((t) => { delete undoHistoryRef.current[t.id] })
        setActiveTabId(newId)
        return [{ id: newId, name: `new ${newId}`, content: '', modified: false }]
      }
      const toRemove = prev.filter((t) => !t.modified)
      toRemove.forEach((t) => { delete undoHistoryRef.current[t.id] })
      if (!remaining.find((t) => t.id === activeTabIdRef.current)) {
        setActiveTabId(remaining[0].id)
      }
      return remaining
    })
  }, [])

  const handleSaveSession = useCallback(() => {
    const session = {
      version: 1,
      tabs: tabsRef.current.map((t) => ({ name: t.name, content: t.content, language: t.language ?? null })),
    }
    const json = JSON.stringify(session, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'session.json'
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  const applySessionData = useCallback((session) => {
    if (!(session?.version === 1 && Array.isArray(session.tabs))) return
    const newIds = session.tabs.map(() => nextTabId++)
    const newTabs = session.tabs.map((t, i) => ({
      id: newIds[i],
      name: t.name ?? `new ${newIds[i]}`,
      content: t.content ?? '',
      modified: false,
      language: t.language ?? null,
    }))
    newTabs.forEach((t) => {
      undoHistoryRef.current[t.id] = { stack: [t.content], index: 0, savedIndex: 0 }
    })
    setTabs(newTabs)
    setActiveTabId(newIds[newIds.length - 1])
    setFileHandles({})
  }, [])

  const handleLoadSession = useCallback(async () => {
    if (typeof window.showOpenFilePicker === 'function') {
      try {
        const [handle] = await window.showOpenFilePicker({
          types: [{ description: 'Session files', accept: { 'application/json': ['.json'] } }],
        })
        const file = await handle.getFile()
        applySessionData(JSON.parse(await file.text()))
      } catch (e) {
        if (e.name !== 'AbortError') console.error(e)
      }
    } else {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.json'
      input.onchange = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        try {
          applySessionData(JSON.parse(await file.text()))
        } catch (err) {
          console.error(err)
        }
      }
      input.click()
    }
  }, [applySessionData])

  const handlePrint = useCallback(() => {
    const isView1 = activeView === 1
    const currentTabId = isView1 ? activeTabIdRef.current : view2ActiveTabIdRef.current
    const currentTabs = isView1 ? tabsRef.current : view2TabsRef.current
    const tab = currentTabs.find((t) => t.id === currentTabId)
    const content = tab?.content ?? ''
    const name = tab?.name ?? 'document'
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    const escapeHtml = (str) => str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
    printWindow.document.write(
      `<!DOCTYPE html><html><head><title>${escapeHtml(name)}</title>` +
      `<style>body{margin:1cm;font-family:monospace;white-space:pre-wrap;word-wrap:break-word;}</style>` +
      `</head><body><pre>${escapeHtml(content)}</pre></body></html>`
    )
    printWindow.document.close()
    printWindow.focus()
    printWindow.onafterprint = () => printWindow.close()
    printWindow.print()
  }, [activeView])

  const handleNewWindow = useCallback(() => {
    const url = window.location.href
    const isAppMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: window-controls-overlay)').matches ||
      window.navigator.standalone === true
    if (isAppMode) {
      window.open(url, '_blank')
    } else {
      window.open(url, '_blank', 'noopener,noreferrer,width=1200,height=800')
    }
  }, [])

  const handleExit = useCallback(() => {
    window.close()
  }, [])

  const handleNextTab = useCallback(() => {
    if (activeView === 1) {
      const currentTabs = tabsRef.current
      const idx = currentTabs.findIndex((t) => t.id === activeTabIdRef.current)
      if (idx === -1 || currentTabs.length <= 1) return
      const nextIdx = (idx + 1) % currentTabs.length
      setActiveTabId(currentTabs[nextIdx].id)
    } else {
      const currentTabs = view2TabsRef.current
      const idx = currentTabs.findIndex((t) => t.id === view2ActiveTabIdRef.current)
      if (idx === -1 || currentTabs.length <= 1) return
      const nextIdx = (idx + 1) % currentTabs.length
      setView2ActiveTabId(currentTabs[nextIdx].id)
    }
  }, [activeView])

  const handlePrevTab = useCallback(() => {
    if (activeView === 1) {
      const currentTabs = tabsRef.current
      const idx = currentTabs.findIndex((t) => t.id === activeTabIdRef.current)
      if (idx === -1 || currentTabs.length <= 1) return
      const prevIdx = (idx - 1 + currentTabs.length) % currentTabs.length
      setActiveTabId(currentTabs[prevIdx].id)
    } else {
      const currentTabs = view2TabsRef.current
      const idx = currentTabs.findIndex((t) => t.id === view2ActiveTabIdRef.current)
      if (idx === -1 || currentTabs.length <= 1) return
      const prevIdx = (idx - 1 + currentTabs.length) % currentTabs.length
      setView2ActiveTabId(currentTabs[prevIdx].id)
    }
  }, [activeView])

  const handleSortTabsBy = useCallback((sortBy) => {
    const [field, dir] = sortBy.split('-')
    const isDesc = dir === 'desc'
    const getKey = (tab) => {
      switch (field) {
        case 'name': return tab.name.toLowerCase()
        case 'type': {
          const dotIdx = tab.name.lastIndexOf('.')
          return dotIdx >= 0 ? tab.name.slice(dotIdx + 1).toLowerCase() : ''
        }
        case 'length': return tab.content.length
        default: return tab.name.toLowerCase()
      }
    }
    const isNumeric = field === 'length'
    const sortFn = (a, b) => {
      const ka = getKey(a)
      const kb = getKey(b)
      if (isNumeric) return isDesc ? kb - ka : ka - kb
      return isDesc ? kb.localeCompare(ka) : ka.localeCompare(kb)
    }
    if (activeView === 1) {
      setTabs((prev) => [...prev].sort(sortFn))
    } else {
      setView2Tabs((prev) => [...prev].sort(sortFn))
    }
  }, [activeView])

  const handleDebugInfo = useCallback(() => {
    const lines = [
      'glitch.txt',
      `URL: ${window.location.href}`,
      `User Agent: ${navigator.userAgent}`,
    ]
    window.alert(lines.join('\n'))
  }, [])

  const handleWindowsActivate = useCallback((tabId, view) => {
    if (view === 2) {
      setActiveView(2)
      setView2ActiveTabId(tabId)
    } else {
      setActiveView(1)
      setActiveTabId(tabId)
    }
  }, [])

  const handleDropFiles = useCallback(async (files) => {
    const fileArray = Array.from(files)
    const ids = fileArray.map(() => nextTabId++)
    let lastId = null
    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i]
      const id = ids[i]
      const content = await file.text()
      undoHistoryRef.current[id] = { stack: [content], index: 0, savedIndex: 0 }
      setTabs((prev) => [...prev, { id, name: file.name, content, modified: false, language: detectLanguage(file.name) }])
      lastId = id
    }
    if (lastId !== null) {
      setActiveTabId(lastId)
    }
  }, [])

  const handleDragOver = useCallback((e) => {
    if (e.dataTransfer.types.includes('Files')) {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'copy'
      setIsDragOver(true)
    }
  }, [])

  const handleDragLeave = useCallback((e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragOver(false)
    }
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setIsDragOver(false)
    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      handleDropFiles(files)
    }
  }, [handleDropFiles])

  const handleFileAction = useCallback(
    (action) => {
      switch (action) {
        case 'new': handleNewTab(); break
        case 'open': handleOpen(); break
        case 'reload': handleReload(); break
        case 'save': handleSave(); break
        case 'saveAs': handleSaveAs(); break
        case 'saveCopyAs': handleSaveCopyAs(); break
        case 'saveAll': handleSaveAll(); break
        case 'rename': handleRename(); break
        case 'closeActive': handleCloseActive(); break
        case 'closeAll': handleCloseAll(); break
        case 'closeAllButActive': handleCloseAllButActive(); break
        case 'closeAllToLeft': handleCloseAllToLeft(); break
        case 'closeAllToRight': handleCloseAllToRight(); break
        case 'closeAllUnchanged': handleCloseAllUnchanged(); break
        case 'loadSession': handleLoadSession(); break
        case 'saveSession': handleSaveSession(); break
        case 'print': handlePrint(); break
        case 'printNow': handlePrint(); break
        case 'exit': handleExit(); break
        case 'about': setAboutDialogOpen(true); break
        case 'styleConfigurator': setStyleConfiguratorOpen(true); break
        case 'windows': setWindowsDialogOpen(true); break
        case 'nextTab': handleNextTab(); break
        case 'prevTab': handlePrevTab(); break
        case 'sort-tabs-name-asc': handleSortTabsBy('name-asc'); break
        case 'sort-tabs-name-desc': handleSortTabsBy('name-desc'); break
        case 'sort-tabs-type-asc': handleSortTabsBy('type-asc'); break
        case 'sort-tabs-type-desc': handleSortTabsBy('type-desc'); break
        case 'sort-tabs-length-asc': handleSortTabsBy('length-asc'); break
        case 'sort-tabs-length-desc': handleSortTabsBy('length-desc'); break
        case 'debug-info': handleDebugInfo(); break
        default: break
      }
    },
    [
      handleNewTab, handleOpen, handleReload, handleSave,
      handleSaveAs, handleSaveCopyAs, handleSaveAll, handleRename,
      handleCloseActive, handleCloseAll, handleCloseAllButActive,
      handleCloseAllToLeft, handleCloseAllToRight, handleCloseAllUnchanged,
      handleLoadSession, handleSaveSession,
      handlePrint, handleExit, handleNextTab, handlePrevTab,
      handleSortTabsBy, handleDebugInfo,
    ]
  )

  const handleZoomIn = useCallback(() => setFontSize((prev) => Math.min(prev + 1, MAX_FONT_SIZE)), [])
  const handleZoomOut = useCallback(() => setFontSize((prev) => Math.max(prev - 1, MIN_FONT_SIZE)), [])
  const handleZoomReset = useCallback(() => setFontSize(DEFAULT_FONT_SIZE), [])

  // ── Move / Clone / Focus other view ──────────────────────────────────────
  const handleMoveToOtherView = useCallback(() => {
    const srcView = activeView
    const srcTabId = srcView === 1 ? activeTabIdRef.current : view2ActiveTabIdRef.current
    const srcTabs = srcView === 1 ? tabsRef.current : view2TabsRef.current

    const movedTab = srcTabs.find((t) => t.id === srcTabId)
    if (!movedTab) return

    if (srcView === 1) {
      const remaining = srcTabs.filter((t) => t.id !== srcTabId)
      if (remaining.length === 0) {
        const newId = nextTabId++
        setTabs([{ id: newId, name: `new ${newId}`, content: '', modified: false }])
        setActiveTabId(newId)
      } else {
        const idx = srcTabs.findIndex((t) => t.id === srcTabId)
        setTabs(remaining)
        setActiveTabId(remaining[Math.min(idx, remaining.length - 1)].id)
      }
      setView2Tabs((prev) => [...prev, movedTab])
      setView2ActiveTabId(srcTabId)
      setSplitEnabled(true)
      setActiveView(2)
    } else {
      const remaining = srcTabs.filter((t) => t.id !== srcTabId)
      setView2Tabs(remaining)
      if (remaining.length === 0) {
        setSplitEnabled(false)
        setActiveView(1)
      } else {
        const idx = srcTabs.findIndex((t) => t.id === srcTabId)
        setView2ActiveTabId(remaining[Math.min(idx, remaining.length - 1)].id)
      }
      setTabs((prev) => [...prev, movedTab])
      setActiveTabId(srcTabId)
      setActiveView(1)
    }
  }, [activeView])

  const handleCloneToOtherView = useCallback(() => {
    const srcView = activeView
    const srcTabId = srcView === 1 ? activeTabIdRef.current : view2ActiveTabIdRef.current
    const srcTabs = srcView === 1 ? tabsRef.current : view2TabsRef.current

    const srcTab = srcTabs.find((t) => t.id === srcTabId)
    if (!srcTab) return

    const newId = nextTabId++
    const cloneTab = { ...srcTab, id: newId }
    undoHistoryRef.current[newId] = { stack: [srcTab.content], index: 0, savedIndex: 0 }

    if (srcView === 1) {
      setView2Tabs((prev) => [...prev, cloneTab])
      setView2ActiveTabId(newId)
    } else {
      setTabs((prev) => [...prev, cloneTab])
      setActiveTabId(newId)
      setActiveView(1)
    }
    setSplitEnabled(true)
  }, [activeView])

  const handleFocusOtherView = useCallback(() => {
    if (!splitEnabled) return
    const nextView = activeView === 1 ? 2 : 1
    setActiveView(nextView)
    if (nextView === 2) {
      secondEditorRef.current?.focus()
    } else {
      editorRef.current?.focus()
    }
  }, [splitEnabled, activeView])

  const handleEditor1Scroll = useCallback((scrollTop, scrollLeft) => {
    if (!splitEnabled || syncScrollingRef.current) return
    if (!syncScrollV && !syncScrollH) return
    syncScrollingRef.current = true
    secondEditorRef.current?.setScrollPosition(
      syncScrollV ? scrollTop : null,
      syncScrollH ? scrollLeft : null
    )
    requestAnimationFrame(() => { syncScrollingRef.current = false })
  }, [splitEnabled, syncScrollV, syncScrollH])

  const handleEditor2Scroll = useCallback((scrollTop, scrollLeft) => {
    if (!splitEnabled || syncScrollingRef.current) return
    if (!syncScrollV && !syncScrollH) return
    syncScrollingRef.current = true
    editorRef.current?.setScrollPosition(
      syncScrollV ? scrollTop : null,
      syncScrollH ? scrollLeft : null
    )
    requestAnimationFrame(() => { syncScrollingRef.current = false })
  }, [splitEnabled, syncScrollV, syncScrollH])

  const handleViewAction = useCallback((action) => {
    // Tab navigation/management by sub-action
    if (action.startsWith('view-tab-')) {
      const sub = action.slice('view-tab-'.length)
      const currentTabs = activeView === 1 ? tabsRef.current : view2TabsRef.current
      const currentActiveId = activeView === 1 ? activeTabIdRef.current : view2ActiveTabIdRef.current
      if (sub === 'first') {
        if (activeView === 1) setActiveTabId(currentTabs[0]?.id)
        else setView2ActiveTabId(currentTabs[0]?.id)
        return
      }
      if (sub === 'last') {
        if (activeView === 1) setActiveTabId(currentTabs[currentTabs.length - 1]?.id)
        else setView2ActiveTabId(currentTabs[currentTabs.length - 1]?.id)
        return
      }
      if (sub === 'move-start') {
        const setT = activeView === 1 ? setTabs : setView2Tabs
        setT((prev) => {
          const idx = prev.findIndex((t) => t.id === currentActiveId)
          if (idx <= 0) return prev
          const tab = prev[idx]
          return [tab, ...prev.slice(0, idx), ...prev.slice(idx + 1)]
        })
        return
      }
      if (sub === 'move-end') {
        const setT = activeView === 1 ? setTabs : setView2Tabs
        setT((prev) => {
          const idx = prev.findIndex((t) => t.id === currentActiveId)
          if (idx === -1 || idx === prev.length - 1) return prev
          const tab = prev[idx]
          return [...prev.slice(0, idx), ...prev.slice(idx + 1), tab]
        })
        return
      }
      if (sub === 'move-forward') {
        const setT = activeView === 1 ? setTabs : setView2Tabs
        setT((prev) => {
          const idx = prev.findIndex((t) => t.id === currentActiveId)
          if (idx === -1 || idx >= prev.length - 1) return prev
          const next = [...prev]
          ;[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]
          return next
        })
        return
      }
      if (sub === 'move-backward') {
        const setT = activeView === 1 ? setTabs : setView2Tabs
        setT((prev) => {
          const idx = prev.findIndex((t) => t.id === currentActiveId)
          if (idx <= 0) return prev
          const next = [...prev]
          ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
          return next
        })
        return
      }
      if (sub.startsWith('color-')) {
        const colorPart = sub.slice('color-'.length)
        const colorNum = colorPart === 'remove' ? null : parseInt(colorPart, 10)
        if (activeView === 1) {
          setTabs((prev) => prev.map((t) => t.id === currentActiveId ? { ...t, color: colorNum } : t))
        } else {
          setView2Tabs((prev) => prev.map((t) => t.id === currentActiveId ? { ...t, color: colorNum } : t))
        }
        return
      }
      const n = parseInt(sub, 10)
      if (!isNaN(n) && n >= 1 && n <= currentTabs.length) {
        if (activeView === 1) setActiveTabId(currentTabs[n - 1].id)
        else setView2ActiveTabId(currentTabs[n - 1].id)
      }
      return
    }
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
      case 'distraction-free':
        setDistractionFree((prev) => !prev)
        break
      case 'view-in-browser': {
        const tab = getActiveTabRecord()
        if (!tab) break
        const ext = tab.name.split('.').pop().toLowerCase()
        const htmlExts = new Set(['html', 'htm', 'xhtml', 'svg'])
        const mimeType = htmlExts.has(ext) ? 'text/html' : 'text/plain'
        const blob = new Blob([tab.content], { type: mimeType })
        const url = URL.createObjectURL(blob)
        window.open(url, '_blank', 'noopener,noreferrer')
        // Revoke the object URL after a generous delay; the actual lifecycle is tied to
        // the document so this just frees the browser's internal reference entry.
        setTimeout(() => URL.revokeObjectURL(url), 300_000)
        break
      }
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
      case 'move-to-other-view':
        handleMoveToOtherView()
        break
      case 'clone-to-other-view':
        handleCloneToOtherView()
        break
      case 'focus-other-view':
        handleFocusOtherView()
        break
      case 'fold-all':
        getActiveEditor()?.foldAll()
        break
      case 'unfold-all':
        getActiveEditor()?.unfoldAll()
        break
      case 'hide-lines':
        getActiveEditor()?.hideLines()
        break
      case 'document-list':
        setWindowsDialogOpen(true)
        break
      case 'sync-scroll-v':
        setSyncScrollV((prev) => !prev)
        break
      case 'sync-scroll-h':
        setSyncScrollH((prev) => !prev)
        break
      case 'text-dir-rtl':
        setTextDirection('rtl')
        break
      case 'text-dir-ltr':
        setTextDirection('ltr')
        break
      case 'summary': {
        const tab = getActiveTabRecord()
        const tabContent = tab?.content ?? ''
        const lines = tabContent.split('\n').length
        const chars = tabContent.length
        const trimmed = tabContent.trim()
        const words = trimmed ? trimmed.split(/\s+/).length : 0
        window.alert(`File: ${tab?.name ?? '(untitled)'}\n\nLines: ${lines}\nWords: ${words}\nCharacters: ${chars}`)
        break
      }
      case 'nextTab':
        handleNextTab()
        break
      case 'prevTab':
        handlePrevTab()
        break
      default:
        break
    }
  }, [handleZoomIn, handleZoomOut, handleZoomReset, handleMoveToOtherView, handleCloneToOtherView, handleFocusOtherView, getActiveEditor, getActiveTabRecord, handleNextTab, handlePrevTab, activeView])

  const handleLanguageAction = useCallback((action) => {
    const tabId = activeTabIdRef.current
    const tab = tabsRef.current.find((t) => t.id === tabId)
    if (action === 'lang-plain-text') {
      setTabs((prev) => prev.map((t) => (t.id === tabId ? { ...t, language: null } : t)))
    } else if (action.startsWith('lang-')) {
      const langId = action.slice(5)
      setTabs((prev) => prev.map((t) => (t.id === tabId ? { ...t, language: langId } : t)))
      // Warn after applying the change — highlighting is disabled above the
      // threshold so the selection will have no visual effect.
      if (tab && tab.content.length > LARGE_FILE_THRESHOLD) {
        window.alert('This file is too large for syntax highlighting. Language mode has been changed but highlighting will not be applied.')
      }
    }
  }, [])

  const computeHash = useCallback(async (algorithm, text) => {
    if (algorithm === 'MD5') return md5(text)
    const algoMap = { 'SHA-1': 'SHA-1', 'SHA-256': 'SHA-256', 'SHA-512': 'SHA-512' }
    const enc = new TextEncoder()
    const data = enc.encode(text)
    const hashBuffer = await crypto.subtle.digest(algoMap[algorithm], data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  }, [])

  const handleToolsAction = useCallback(async (action) => {
    let algorithm = 'MD5'
    if (action.startsWith('sha1-')) algorithm = 'SHA-1'
    else if (action.startsWith('sha256-') || action.startsWith('sha-256-')) algorithm = 'SHA-256'
    else if (action.startsWith('sha512-')) algorithm = 'SHA-512'

    const isFromSelection = action.endsWith('-from-selection')
    const isGenerate = action.endsWith('-generate')

    if (isFromSelection) {
      const selected = getActiveEditor()?.getSelectedText?.() ?? ''
      const hash = await computeHash(algorithm, selected)
      navigator.clipboard?.writeText(hash).catch(() => {})
      return
    }

    if (isGenerate) {
      setToolsHashAlgorithm(algorithm)
      setToolsHashInitialText('')
      setToolsHashDialogOpen(true)
    }
  }, [computeHash, getActiveEditor])

  // Search handlers
  const handleFindNext = useCallback((term, options) => {
    if (term !== undefined) {
      searchStateRef.current = { term, options }
    }
    const { term: t, options: o } = searchStateRef.current
    return t ? (getActiveEditor()?.findNext(t, o) ?? false) : false
  }, [getActiveEditor])

  const handleFindPrev = useCallback((term, options) => {
    if (term !== undefined) {
      searchStateRef.current = { term, options }
    }
    const { term: t, options: o } = searchStateRef.current
    return t ? (getActiveEditor()?.findPrev(t, o) ?? false) : false
  }, [getActiveEditor])

  const handleReplace = useCallback((term, replacement, options) => {
    searchStateRef.current = { term, options }
    getActiveEditor()?.replaceOne(term, replacement, options)
  }, [getActiveEditor])

  const handleReplaceAll = useCallback((term, replacement, options) => {
    searchStateRef.current = { term, options }
    return getActiveEditor()?.replaceAll(term, replacement, options) ?? 0
  }, [getActiveEditor])

  const handleSelectAndFindNext = useCallback(() => {
    const ed = getActiveEditor()
    const word = ed?.selectWordAtCursor()
    if (word) {
      const options = { matchCase: false, wholeWord: false, wrapAround: true }
      searchStateRef.current = { term: word, options }
      ed?.findNext(word, options)
    }
  }, [getActiveEditor])

  const handleSelectAndFindPrev = useCallback(() => {
    const ed = getActiveEditor()
    const word = ed?.selectWordAtCursor()
    if (word) {
      const options = { matchCase: false, wholeWord: false, wrapAround: true }
      searchStateRef.current = { term: word, options }
      ed?.findPrev(word, options)
    }
  }, [getActiveEditor])

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
        getActiveEditor()?.goToMatchingBrace()
        break
      default:
        break
    }
  }, [handleFindNext, handleFindPrev, handleSelectAndFindNext, handleSelectAndFindPrev, getActiveEditor])

  const dispatchEditAction = useCallback((action, { record = true } = {}) => {
    if (record) recordMacroStep('Edit', action)
    handleEditAction(action)
  }, [recordMacroStep, handleEditAction])

  const dispatchViewAction = useCallback((action, { record = true } = {}) => {
    if (record) recordMacroStep('View', action)
    handleViewAction(action)
  }, [recordMacroStep, handleViewAction])

  const dispatchSearchAction = useCallback((action, { record = true } = {}) => {
    if (record) recordMacroStep('Search', action)
    handleSearchAction(action)
  }, [recordMacroStep, handleSearchAction])

  const dispatchLanguageAction = useCallback((action, { record = true } = {}) => {
    if (record) recordMacroStep('Language', action)
    handleLanguageAction(action)
  }, [recordMacroStep, handleLanguageAction])

  const dispatchToolsAction = useCallback((action, { record = true } = {}) => {
    if (record) recordMacroStep('Tools', action)
    handleToolsAction(action)
  }, [recordMacroStep, handleToolsAction])

  const playbackMacro = useCallback((macroSteps, times = 1) => {
    if (isRecordingMacroRef.current || isPlayingBackMacroRef.current) return
    if (!Array.isArray(macroSteps) || macroSteps.length === 0) return
    const runCount = Math.max(1, Math.floor(times))
    isPlayingBackMacroRef.current = true
    try {
      for (let run = 0; run < runCount; run++) {
        for (const step of macroSteps) {
          if (!step || typeof step.action !== 'string' || typeof step.menu !== 'string') continue
          switch (step.menu) {
            case 'Edit':
              dispatchEditAction(step.action, { record: false })
              break
            case 'View':
              dispatchViewAction(step.action, { record: false })
              break
            case 'Search':
              dispatchSearchAction(step.action, { record: false })
              break
            case 'Language':
              dispatchLanguageAction(step.action, { record: false })
              break
            case 'Tools':
              dispatchToolsAction(step.action, { record: false })
              break
            case 'Macro':
              if (step.action === 'insert-text' && typeof step.text === 'string') {
                getActiveEditor()?.insertText?.(step.text)
              }
              break
            default:
              break
          }
        }
      }
    } finally {
      isPlayingBackMacroRef.current = false
    }
  }, [dispatchEditAction, dispatchViewAction, dispatchSearchAction, dispatchLanguageAction, dispatchToolsAction, getActiveEditor])

  const handleMacroAction = useCallback((action) => {
    switch (action) {
      case 'macro-start-recording':
        if (isRecordingMacroRef.current) return
        setCurrentMacroSteps([])
        setHasStoppedRecordingMacro(false)
        setIsRecordingMacro(true)
        break
      case 'macro-stop-recording':
        if (!isRecordingMacroRef.current) return
        setIsRecordingMacro(false)
        setHasStoppedRecordingMacro(true)
        break
      case 'macro-playback':
        playbackMacro(currentMacroStepsRef.current, 1)
        break
      case 'macro-save-current': {
        const steps = currentMacroStepsRef.current
        const hasRecordableMacro = hasStoppedRecordingMacroRef.current || steps.length > 0
        if (!hasRecordableMacro || isRecordingMacroRef.current) return
        const defaultName = `Recorded Macro ${savedMacrosRef.current.length + 1}`
        const name = window.prompt('Save macro as:', defaultName)
        const trimmedName = name?.trim()
        if (!trimmedName) return
        setSavedMacros((prev) => [...prev, { name: trimmedName, steps: [...steps] }])
        break
      }
      case 'macro-run-multiple': {
        if (isRecordingMacroRef.current) return
        const runnable = []
        if (hasStoppedRecordingMacroRef.current || currentMacroStepsRef.current.length > 0) {
          runnable.push({ name: 'Current recorded macro', steps: currentMacroStepsRef.current })
        }
        runnable.push(...savedMacrosRef.current)
        if (runnable.length === 0) return
        let selectedMacro = runnable[0]
        if (runnable.length > 1) {
          const options = runnable.map((macro, idx) => `${idx + 1}. ${macro.name}`).join('\n')
          const selectedIndexRaw = window.prompt(`Select a macro to run:\n${options}`, '1')
          if (selectedIndexRaw == null) return
          const selectedIndex = Number.parseInt(selectedIndexRaw, 10)
          if (Number.isNaN(selectedIndex) || selectedIndex < 1 || selectedIndex > runnable.length) return
          selectedMacro = runnable[selectedIndex - 1]
        }
        const timesRaw = window.prompt('Run macro how many times?', '1')
        if (timesRaw == null) return
        const times = Number.parseInt(timesRaw, 10)
        if (Number.isNaN(times) || times < 1) return
        playbackMacro(selectedMacro.steps, times)
        break
      }
      default:
        break
    }
  }, [playbackMacro])

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
      } else if (ctrl && !e.shiftKey && !e.altKey && key === 'w') {
        e.preventDefault()
        handleCloseActive()
      } else if (ctrl && e.shiftKey && !e.altKey && key === 'p') {
        e.preventDefault()
        handleMacroAction('macro-playback')
      } else if (e.altKey && e.code === 'KeyW') {
        e.preventDefault()
        dispatchViewAction('word-wrap')
      } else if (e.altKey && !e.shiftKey && e.code === 'KeyH') {
        e.preventDefault()
        dispatchViewAction('hide-lines')
      } else if (e.altKey && !e.shiftKey && e.key === '0') {
        e.preventDefault()
        dispatchViewAction('fold-all')
      } else if (e.altKey && e.shiftKey && e.key === '0') {
        e.preventDefault()
        dispatchViewAction('unfold-all')
      } else if (e.key === 'F11') {
        e.preventDefault()
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen?.()
        } else {
          document.exitFullscreen?.()
        }
      } else if (ctrl && !e.altKey && e.key === 'Tab') {
        e.preventDefault()
        if (e.shiftKey) {
          handlePrevTab()
        } else {
          handleNextTab()
        }
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [handleNewTab, handleNewWindow, handleOpen, handleSave, handleSaveAs, handleSaveAll, handlePrint, handleCloseActive, handleNextTab, handlePrevTab, dispatchViewAction, handleMacroAction])

  useEffect(() => {
    const handleKeyDown = (e) => {
      const ctrl = e.ctrlKey || e.metaKey
      const shift = e.shiftKey
      const alt = e.altKey

      if (ctrl && !shift && !alt && e.key === 'f') {
        e.preventDefault()
        dispatchSearchAction('find')
      } else if (ctrl && !shift && !alt && e.key === 'h') {
        e.preventDefault()
        dispatchSearchAction('replace')
      } else if (!ctrl && !shift && !alt && e.key === 'F3') {
        e.preventDefault()
        dispatchSearchAction('findNext')
      } else if (!ctrl && shift && !alt && e.key === 'F3') {
        e.preventDefault()
        dispatchSearchAction('findPrev')
      } else if (ctrl && !shift && !alt && e.key === 'F3') {
        e.preventDefault()
        dispatchSearchAction('selectFindNext')
      } else if (ctrl && shift && !alt && e.key === 'F3') {
        e.preventDefault()
        dispatchSearchAction('selectFindPrev')
      } else if (ctrl && !shift && !alt && e.key === 'g') {
        e.preventDefault()
        dispatchSearchAction('goTo')
      } else if (ctrl && !shift && !alt && e.key === 'b') {
        e.preventDefault()
        dispatchSearchAction('goToMatchingBrace')
      } else if (ctrl && !shift && alt && e.key === 'i') {
        e.preventDefault()
        dispatchSearchAction('incrementalSearch')
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [dispatchSearchAction])

  // Incremental search handlers - pass noFocus so the search input keeps focus
  const handleIncrementalSearch = useCallback((term) => {
    if (!term) return true
    const options = { matchCase: false, wholeWord: false, wrapAround: true, noFocus: true }
    searchStateRef.current = { term, options }
    return getActiveEditor()?.findNext(term, options) ?? false
  }, [getActiveEditor])

  const handleIncrementalSearchNext = useCallback((term) => {
    if (!term) return true
    const options = { ...searchStateRef.current.options, noFocus: true }
    searchStateRef.current = { term, options }
    return getActiveEditor()?.findNext(term, options) ?? false
  }, [getActiveEditor])

  const handleIncrementalSearchPrev = useCallback((term) => {
    if (!term) return true
    const options = { ...searchStateRef.current.options, noFocus: true }
    searchStateRef.current = { term, options }
    return getActiveEditor()?.findPrev(term, options) ?? false
  }, [getActiveEditor])

  // ── Common editor props builder ───────────────────────────────────────────
  const commonEditorProps = { wordWrap, fontSize, showWhitespace, showEol, showIndent, onUndo: handleUndo, onRedo: handleRedo, textDirection }

  const view2ActiveTab = view2Tabs.find((t) => t.id === view2ActiveTabId)
  const displayCursorPos = activeView === 1 ? cursorPos : view2CursorPos
  const displayLanguage = activeView === 1 ? language : (view2ActiveTab?.language ?? null)
  const displayContent = activeView === 1 ? (activeTab?.content ?? '') : (view2ActiveTab?.content ?? '')
  const displayIsLargeFile = displayContent.length > LARGE_FILE_THRESHOLD

  return (
    <div
      className={`${styles.app} ${isDragOver ? styles.dragOver : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragOver && (
        <div className={styles.dragOverlay} aria-hidden="true">
          <span className={styles.dragOverlayText}>Drop files to open</span>
        </div>
      )}
      <MenuBar
        onFileAction={handleFileAction}
        onEditAction={dispatchEditAction}
        onViewAction={dispatchViewAction}
        onSearchAction={dispatchSearchAction}
        onLanguageAction={dispatchLanguageAction}
        onToolsAction={dispatchToolsAction}
        onMacroAction={handleMacroAction}
        viewState={viewState}
        fileState={fileState}
        macroState={macroState}
      />
      {!distractionFree && (
        <Toolbar
          isDark={THEMES.find((t) => t.id === themeId)?.dark ?? false}
          onNew={handleNewTab}
          onOpen={handleOpen}
          onSave={handleSave}
          onSaveAll={handleSaveAll}
          onClose={handleCloseActive}
          onCloseAll={handleCloseAll}
          onPrint={handlePrint}
          onUndo={() => dispatchEditAction('undo')}
          onRedo={() => dispatchEditAction('redo')}
          onCut={() => dispatchEditAction('cut')}
          onCopy={() => dispatchEditAction('copy')}
          onPaste={() => dispatchEditAction('paste')}
          onFind={() => dispatchSearchAction('find')}
          onReplace={() => dispatchSearchAction('replace')}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onSyncScrollV={() => dispatchViewAction('sync-scroll-v')}
          onSyncScrollH={() => dispatchViewAction('sync-scroll-h')}
          onWordWrap={() => dispatchViewAction('word-wrap')}
          onShowAllChars={() => dispatchViewAction('show-all-chars')}
          onShowIndent={() => dispatchViewAction('show-indent')}
          viewState={viewState}
        />
      )}
      <IncrementalSearch
        isOpen={incrementalSearchOpen}
        onClose={() => { setIncrementalSearchOpen(false); getActiveEditor()?.focus() }}
        onSearch={handleIncrementalSearch}
        onSearchNext={handleIncrementalSearchNext}
        onSearchPrev={handleIncrementalSearchPrev}
      />
      {splitEnabled ? (
        <SplitPane
          ratio={splitRatio}
          onRatioChange={setSplitRatio}
          left={
            <div
              className={`${styles.viewPane} ${activeView === 1 ? styles.activeViewPane : ''}`}
              onFocus={() => setActiveView(1)}
            >
              {!distractionFree && (
                <TabBar
                  tabs={tabs}
                  activeTabId={activeTabId}
                  onSelect={setActiveTabId}
                  onClose={handleCloseTab}
                />
              )}
              <Editor
                key={activeTabId}
                ref={editorRef}
                content={activeTab?.content ?? ''}
                onChange={handleContentChange}
                onCursorChange={setCursorPos}
                onEditorScroll={handleEditor1Scroll}
                {...commonEditorProps}
                language={language}
              />
            </div>
          }
          right={
            <div
              className={`${styles.viewPane} ${activeView === 2 ? styles.activeViewPane : ''}`}
              onFocus={() => setActiveView(2)}
            >
              {!distractionFree && (
                <TabBar
                  tabs={view2Tabs}
                  activeTabId={view2ActiveTabId}
                  onSelect={setView2ActiveTabId}
                  onClose={handleCloseView2Tab}
                />
              )}
              <Editor
                key={view2ActiveTabId ?? 'view2-empty'}
                ref={secondEditorRef}
                content={view2ActiveTab?.content ?? ''}
                onChange={handleView2ContentChange}
                onCursorChange={setView2CursorPos}
                onEditorScroll={handleEditor2Scroll}
                {...commonEditorProps}
                language={view2ActiveTab?.language ?? null}
              />
            </div>
          }
        />
      ) : (
        <>
          {!distractionFree && (
            <TabBar
              tabs={tabs}
              activeTabId={activeTabId}
              onSelect={setActiveTabId}
              onClose={handleCloseTab}
            />
          )}
          <Editor
            key={activeTabId}
            ref={editorRef}
            content={activeTab?.content ?? ''}
            onChange={handleContentChange}
            onCursorChange={setCursorPos}
            {...commonEditorProps}
            language={language}
          />
        </>
      )}
      {!distractionFree && (
        <StatusBar cursorPos={displayCursorPos} eol="Windows (CR LF)" encoding="UTF-8" language={displayLanguage} isLargeFile={displayIsLargeFile} />
      )}
      <FindDialog
        isOpen={findDialogOpen}
        mode={findDialogMode}
        onClose={() => { setFindDialogOpen(false); getActiveEditor()?.focus() }}
        onFindNext={handleFindNext}
        onFindPrev={handleFindPrev}
        onReplace={handleReplace}
        onReplaceAll={handleReplaceAll}
      />
      <GoToDialog
        isOpen={goToDialogOpen}
        lineCount={lineCount}
        onClose={() => { setGoToDialogOpen(false); getActiveEditor()?.focus() }}
        onGoTo={(n) => getActiveEditor()?.goToLine(n)}
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
      <ToolsHashDialog
        isOpen={toolsHashDialogOpen}
        algorithm={toolsHashAlgorithm}
        initialText={toolsHashInitialText}
        onClose={() => setToolsHashDialogOpen(false)}
      />
      <ToolsRandomDialog
        isOpen={toolsRandomDialogOpen}
        onClose={() => setToolsRandomDialogOpen(false)}
      />
      <WindowsDialog
        isOpen={windowsDialogOpen}
        tabs={tabs}
        view2Tabs={view2Tabs}
        activeTabId={activeTabId}
        view2ActiveTabId={view2ActiveTabId}
        onActivate={handleWindowsActivate}
        onClose={() => setWindowsDialogOpen(false)}
      />
    </div>
  )
}
