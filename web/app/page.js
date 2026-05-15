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
import PreferencesDialog, { DEFAULT_TOOLBAR_SETTINGS } from '../components/PreferencesDialog'
import ToolsHashDialog from '../components/ToolsHashDialog'
import ToolsRandomDialog from '../components/ToolsRandomDialog'
import WindowsDialog from '../components/WindowsDialog'
import DocumentMapPanel from '../components/DocumentMapPanel'
import FunctionListPanel from '../components/FunctionListPanel'
import { extractSymbols } from '../lib/functionList.mjs'
import { md5 } from '../lib/md5'
import { applyTheme, THEMES, DEFAULT_THEME_ID } from '../lib/themes'
import { detectLanguage } from '../lib/languages/index'
import { buildMacroTextStep } from '../lib/macroTextSteps.mjs'
import { handleBrowserExit } from '../lib/exitPage.mjs'
import { getOrderedTabs, setTabPinned, getBulkClosableTabIds, shouldPersistAutosaveTab, normalizePinnedState } from '../lib/pinnedTabs.mjs'
import { createWebPreviewTab } from '../lib/webPreviewTab.mjs'
import styles from './page.module.css'

const DEFAULT_FONT_SIZE = 13
const MIN_FONT_SIZE = 6
const MAX_FONT_SIZE = 32
const INITIAL_TAB_NAME = 'new 1'
const INITIAL_TAB = { id: 1, name: INITIAL_TAB_NAME, content: '', modified: false, pinned: false, pinOrder: null }
const AUTOSAVE_STORAGE_KEY = 'nppw-autosave-backup'
const AUTOSAVE_INTERVAL_MS = 5_000

// Cap the undo stack for large files to avoid unbounded memory growth.
// Each entry stores a full copy of the document content.
const LARGE_FILE_THRESHOLD = 100_000 // ~100 KB of text
const MAX_UNDO_LARGE_FILE = 20
const MACROS_STORAGE_KEY = 'nppw-macros'
const MAX_RECORDED_MACRO_STEPS = 5000
const MACRO_DEBUG_TAB_NAME = 'macro-debug.log'
const MACRO_DEBUG_QUERY_PARAM = 'macroDebug'
const MACRO_DEBUG_MAX_LINES = 2000
const TOOLBAR_SETTINGS_KEY = 'nppw-toolbar-settings'
const TOOLBAR_HEIGHT_SMALL = '29px'
const TOOLBAR_HEIGHT_LARGE = '43px'
const TOOLBAR_BTN_SIZE_SMALL = '22px'
const TOOLBAR_BTN_SIZE_LARGE = '38px'

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

  const activeViewRef = useRef(activeView)
  useEffect(() => { activeViewRef.current = activeView }, [activeView])

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
  const [preferencesOpen, setPreferencesOpen] = useState(false)
  const [toolsHashDialogOpen, setToolsHashDialogOpen] = useState(false)
  const [toolsHashAlgorithm, setToolsHashAlgorithm] = useState('MD5')
  const [toolsHashInitialText, setToolsHashInitialText] = useState('')
  const [toolsRandomDialogOpen, setToolsRandomDialogOpen] = useState(false)
  const [themeId, setThemeId] = useState(DEFAULT_THEME_ID)
  const [windowsDialogOpen, setWindowsDialogOpen] = useState(false)
  const [docMapOpen, setDocMapOpen] = useState(false)
  const [docMapScrollInfo, setDocMapScrollInfo] = useState({ scrollTop: 0, scrollHeight: 1, clientHeight: 1 })
  const [funcListOpen, setFuncListOpen] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const [isRecordingMacro, setIsRecordingMacro] = useState(false)
  const [currentMacroSteps, setCurrentMacroSteps] = useState([])
  const [hasStoppedRecordingMacro, setHasStoppedRecordingMacro] = useState(false)
  const [savedMacros, setSavedMacros] = useState([])
  const [toolbarSettings, setToolbarSettings] = useState(DEFAULT_TOOLBAR_SETTINGS)
  const searchStateRef = useRef({ term: '', options: { matchCase: false, wholeWord: false, wrapAround: true } })
  // Guard flag prevents the two editors from triggering each other's scroll endlessly.
  const syncScrollingRef = useRef(false)
  const isRecordingMacroRef = useRef(isRecordingMacro)
  const currentMacroStepsRef = useRef(currentMacroSteps)
  const hasStoppedRecordingMacroRef = useRef(hasStoppedRecordingMacro)
  const savedMacrosRef = useRef(savedMacros)
  const isPlayingBackMacroRef = useRef(false)
  const macroDebugEnabledRef = useRef(false)

  useEffect(() => { isRecordingMacroRef.current = isRecordingMacro }, [isRecordingMacro])
  useEffect(() => { currentMacroStepsRef.current = currentMacroSteps }, [currentMacroSteps])
  useEffect(() => { hasStoppedRecordingMacroRef.current = hasStoppedRecordingMacro }, [hasStoppedRecordingMacro])
  useEffect(() => { savedMacrosRef.current = savedMacros }, [savedMacros])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const raw = params.get(MACRO_DEBUG_QUERY_PARAM)
    macroDebugEnabledRef.current = raw != null && raw !== '0' && raw.toLowerCase() !== 'false'
  }, [])

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

  // Load persisted toolbar settings on mount
  useEffect(() => {
    if (typeof localStorage === 'undefined') return
    try {
      const raw = localStorage.getItem(TOOLBAR_SETTINGS_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        setToolbarSettings({ ...DEFAULT_TOOLBAR_SETTINGS, ...parsed })
      }
    } catch {
      // ignore
    }
  }, [])

  // Persist toolbar settings and update CSS custom properties when settings change.
  // No useEffect cleanup is needed for document-level CSS properties in this SPA
  // because document.documentElement persists for the app's lifetime and each run
  // unconditionally overwrites the previous value.
  useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(TOOLBAR_SETTINGS_KEY, JSON.stringify(toolbarSettings))
    }
    // Adjust toolbar height CSS variable for large icon sets
    const isLarge = toolbarSettings.iconSet === 'large' || toolbarSettings.iconSet === 'large-filled'
    document.documentElement.style.setProperty('--toolbar-height', isLarge ? TOOLBAR_HEIGHT_LARGE : TOOLBAR_HEIGHT_SMALL)
    document.documentElement.style.setProperty('--toolbar-btn-size', isLarge ? TOOLBAR_BTN_SIZE_LARGE : TOOLBAR_BTN_SIZE_SMALL)
  }, [toolbarSettings])

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

  useEffect(() => {
    if (typeof localStorage === 'undefined') return
    try {
      const raw = localStorage.getItem(AUTOSAVE_STORAGE_KEY)
      if (!raw) return
      const backup = JSON.parse(raw)
      if (!(backup?.version === 1 && Array.isArray(backup.tabs) && backup.tabs.length > 0)) return
      const idMap = new Map()
      const restoredTabs = backup.tabs.map((tab) => {
        const restoredId = nextTabId++
        if (typeof tab.id === 'number') {
          idMap.set(tab.id, restoredId)
        }
        return {
          id: restoredId,
          view: tab.view === 2 ? 2 : 1,
          name: tab.name ?? `new ${restoredId}`,
          content: tab.content ?? '',
          modified: true,
          language: tab.language ?? null,
          ...normalizePinnedState(tab),
        }
      })
      let restoredView1Tabs = restoredTabs.filter((tab) => tab.view !== 2).map(({ view, ...tab }) => tab)
      let restoredView2Tabs = restoredTabs.filter((tab) => tab.view === 2).map(({ view, ...tab }) => tab)
      if (restoredView1Tabs.length === 0 && restoredView2Tabs.length > 0) {
        const [firstTab, ...remainingTabs] = restoredView2Tabs
        restoredView1Tabs = [firstTab]
        restoredView2Tabs = remainingTabs
      }
      const restoredActiveTabId = idMap.get(backup.activeTabId)
      const restoredView2ActiveTabId = idMap.get(backup.view2ActiveTabId)
      const fallbackActiveTabId = restoredView1Tabs[restoredView1Tabs.length - 1]?.id ?? 1
      const fallbackView2ActiveTabId = restoredView2Tabs[restoredView2Tabs.length - 1]?.id ?? null
      const nextActiveTabId = restoredView1Tabs.some((tab) => tab.id === restoredActiveTabId)
        ? restoredActiveTabId
        : fallbackActiveTabId
      const nextView2ActiveTabId = restoredView2Tabs.some((tab) => tab.id === restoredView2ActiveTabId)
        ? restoredView2ActiveTabId
        : fallbackView2ActiveTabId
      const nextActiveView = backup.activeView === 2 && restoredView2Tabs.length > 0 ? 2 : 1
      undoHistoryRef.current = {}
      restoredTabs.forEach(({ view, ...tab }) => {
        undoHistoryRef.current[tab.id] = { stack: [tab.content], index: 0, savedIndex: -1 }
      })
      setTabs(restoredView1Tabs)
      setView2Tabs(restoredView2Tabs)
      setSplitEnabled(restoredView2Tabs.length > 0)
      setActiveTabId(nextActiveTabId)
      setView2ActiveTabId(nextView2ActiveTabId)
      setActiveView(nextActiveView)
      setFileHandles({})
    } catch (error) {
      console.error('Failed to restore autosaved tabs:', error)
    }
  }, [])

  useEffect(() => {
    if (typeof localStorage === 'undefined') return undefined
    const saveAutosaveBackup = () => {
      try {
        const unsavedTabs = [...tabsRef.current, ...view2TabsRef.current]
          .filter((tab) => shouldPersistAutosaveTab(tab))
          .map((tab) => ({
            id: tab.id,
            view: view2TabsRef.current.some((view2Tab) => view2Tab.id === tab.id) ? 2 : 1,
            name: tab.name,
            content: tab.content,
            language: tab.language ?? null,
            ...normalizePinnedState(tab),
          }))
        if (unsavedTabs.length === 0) {
          localStorage.removeItem(AUTOSAVE_STORAGE_KEY)
          return
        }
        localStorage.setItem(
          AUTOSAVE_STORAGE_KEY,
          JSON.stringify({
            version: 1,
            activeView: activeViewRef.current,
            activeTabId: activeTabIdRef.current,
            view2ActiveTabId: view2ActiveTabIdRef.current,
            tabs: unsavedTabs,
          })
        )
      } catch (error) {
        console.error('Failed to save autosave backup:', error)
      }
    }
    const intervalId = setInterval(saveAutosaveBackup, AUTOSAVE_INTERVAL_MS)
    window.addEventListener('beforeunload', saveAutosaveBackup)
    return () => {
      clearInterval(intervalId)
      window.removeEventListener('beforeunload', saveAutosaveBackup)
    }
  }, [])

  const activeTab = tabs.find((t) => t.id === activeTabId)
  const lineCount = useMemo(
    () => (activeTab?.content ?? '').split('\n').length,
    [activeTab?.content]
  )
  // Language is stored per-tab (set at file-open time or overridden via Language menu).
  const language = activeTab?.language ?? null

  const viewState = { wordWrap, showWhitespace, showEol, showAllChars, showIndent, language, splitEnabled, distractionFree, syncScrollV, syncScrollH, textDirection, docMapOpen, funcListOpen }

  const orderedTabs = useMemo(() => getOrderedTabs(tabs), [tabs])
  const activeTabIndex = orderedTabs.findIndex((t) => t.id === activeTabId)
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

  // Sync document map scroll info when it opens or the active view changes
  useEffect(() => {
    if (!docMapOpen) return
    const info = getActiveEditor()?.getScrollInfo?.()
    if (info && info.scrollHeight > 0) {
      setDocMapScrollInfo(info)
    }
  }, [docMapOpen, activeView, getActiveEditor])

  const getActiveTabRecord = useCallback(() => {
    const currentTabId = activeView === 1 ? activeTabIdRef.current : view2ActiveTabIdRef.current
    const currentTabs = activeView === 1 ? tabsRef.current : view2TabsRef.current
    return currentTabs.find((tab) => tab.id === currentTabId) ?? null
  }, [activeView])

  const getAllOpenTabs = useCallback(
    () => [...tabsRef.current, ...view2TabsRef.current],
    []
  )

  const appendMacroDebugLine = useCallback((label, details = null) => {
    if (!macroDebugEnabledRef.current) return
    const text = details == null
      ? ''
      : (typeof details === 'string' ? details : JSON.stringify(details))
    const line = `[${new Date().toISOString()}] ${label}${text ? ` ${text}` : ''}`

    setTabs((prev) => {
      const idx = prev.findIndex((tab) => tab.name === MACRO_DEBUG_TAB_NAME)
      if (idx === -1) {
        const id = nextTabId++
        undoHistoryRef.current[id] = { stack: [line], index: 0, savedIndex: -1 }
        return [...prev, { id, name: MACRO_DEBUG_TAB_NAME, content: line, modified: true, language: detectLanguage(MACRO_DEBUG_TAB_NAME), pinned: false, pinOrder: null }]
      }

      const existing = prev[idx]
      const joined = existing.content ? `${existing.content}\n${line}` : line
      const trimmed = joined.split('\n').slice(-MACRO_DEBUG_MAX_LINES).join('\n')
      pushUndoEntry(undoHistoryRef, existing.id, trimmed)
      const next = [...prev]
      next[idx] = { ...existing, content: trimmed, modified: true }
      return next
    })
  }, [])

  const handleNewTab = useCallback(() => {
    const id = nextTabId++
    const name = `new ${id}`
    undoHistoryRef.current[id] = { stack: [''], index: 0, savedIndex: 0 }
    setTabs((prev) => [...prev, { id, name, content: '', modified: false, language: null, pinned: false, pinOrder: null }])
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

  const handleToggleTabPin = useCallback((id) => {
    setTabs((prev) => {
      const target = prev.find((tab) => tab.id === id)
      if (!target) return prev
      return setTabPinned(prev, id, !target.pinned)
    })
  }, [])

  const handleToggleView2TabPin = useCallback((id) => {
    setView2Tabs((prev) => {
      const target = prev.find((tab) => tab.id === id)
      if (!target) return prev
      return setTabPinned(prev, id, !target.pinned)
    })
  }, [])

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
    appendMacroDebugLine('record-step', { menu, action, payload })
    setCurrentMacroSteps((prev) => {
      if (prev.length >= MAX_RECORDED_MACRO_STEPS) return prev
      const next = [...prev, { menu, action, ...payload }]
      currentMacroStepsRef.current = next
      return next
    })
  }, [appendMacroDebugLine])

  const handleContentChange = useCallback((content, selectionMeta = null) => {
    const tabId = activeTabIdRef.current
    const previousContent = tabsRef.current.find((t) => t.id === tabId)?.content ?? ''
    const textStep = buildMacroTextStep(previousContent, content, selectionMeta)
    appendMacroDebugLine('record-text-change:view1', {
      beforeLength: previousContent.length,
      afterLength: content.length,
      selectionMeta,
      inferredStep: textStep,
    })
    if (textStep) {
      recordMacroStep('Macro', textStep.action, textStep)
    }
    pushUndoEntry(undoHistoryRef, tabId, content)
    setTabs((prev) =>
      prev.map((t) => (t.id === tabId ? { ...t, content, modified: true } : t))
    )
  }, [recordMacroStep, appendMacroDebugLine])

  const handleView2ContentChange = useCallback((content, selectionMeta = null) => {
    const tabId = view2ActiveTabIdRef.current
    const previousContent = view2TabsRef.current.find((t) => t.id === tabId)?.content ?? ''
    const textStep = buildMacroTextStep(previousContent, content, selectionMeta)
    appendMacroDebugLine('record-text-change:view2', {
      beforeLength: previousContent.length,
      afterLength: content.length,
      selectionMeta,
      inferredStep: textStep,
    })
    if (textStep) {
      recordMacroStep('Macro', textStep.action, textStep)
    }
    pushUndoEntry(undoHistoryRef, tabId, content)
    setView2Tabs((prev) =>
      prev.map((t) => (t.id === tabId ? { ...t, content, modified: true } : t))
    )
  }, [recordMacroStep, appendMacroDebugLine])

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
          setTabs((prev) => [...prev, { id, name: file.name, content, modified: false, language: detectLanguage(file.name), pinned: false, pinOrder: null }])
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
          setTabs((prev) => [...prev, { id, name: file.name, content, modified: false, language: detectLanguage(file.name), pinned: false, pinOrder: null }])
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
    const closableView1Ids = getBulkClosableTabIds(tabsRef.current)
    const closableView2Ids = getBulkClosableTabIds(view2TabsRef.current)
    const allClosableIds = new Set([...closableView1Ids, ...closableView2Ids])
    if (allClosableIds.size === 0) return

    allClosableIds.forEach((id) => { delete undoHistoryRef.current[id] })
    setFileHandles((existing) => {
      const next = { ...existing }
      allClosableIds.forEach((id) => { delete next[id] })
      return next
    })

    let remainingView1 = tabsRef.current.filter((tab) => !allClosableIds.has(tab.id))
    let remainingView2 = view2TabsRef.current.filter((tab) => !allClosableIds.has(tab.id))

    if (remainingView1.length === 0) {
      if (remainingView2.length > 0) {
        remainingView1 = [remainingView2[0]]
        remainingView2 = remainingView2.slice(1)
        setView2Tabs(remainingView2)
      } else {
        const newId = nextTabId++
        undoHistoryRef.current[newId] = { stack: [''], index: 0, savedIndex: 0 }
        remainingView1 = [{ id: newId, name: `new ${newId}`, content: '', modified: false, language: null, pinned: false, pinOrder: null }]
      }
    } else {
      setView2Tabs(remainingView2)
    }

    setTabs(remainingView1)
    if (!remainingView1.find((tab) => tab.id === activeTabIdRef.current)) {
      setActiveTabId(remainingView1[0].id)
    }
    if (!remainingView2.find((tab) => tab.id === view2ActiveTabIdRef.current)) {
      setView2ActiveTabId(remainingView2[0]?.id ?? null)
    }
    if (remainingView2.length === 0) {
      setSplitEnabled(false)
      if (activeViewRef.current === 2) setActiveView(1)
    } else {
      setSplitEnabled(true)
    }
  }, [])

  const handleCloseAllButActive = useCallback(() => {
    setTabs((prev) => {
      const active = prev.find((t) => t.id === activeTabIdRef.current)
      if (!active) return prev
      const closableIds = new Set(getBulkClosableTabIds(prev, (tab) => tab.id !== active.id))
      if (closableIds.size === 0) return prev
      closableIds.forEach((id) => { delete undoHistoryRef.current[id] })
      setFileHandles((existing) => {
        const next = { ...existing }
        closableIds.forEach((id) => { delete next[id] })
        return next
      })
      return prev.filter((tab) => !closableIds.has(tab.id))
    })
  }, [])

  const handleCloseAllButPinned = useCallback(() => {
    handleCloseAll()
  }, [handleCloseAll])

  const handleCloseAllToLeft = useCallback(() => {
    setTabs((prev) => {
      const ordered = getOrderedTabs(prev)
      const idx = ordered.findIndex((t) => t.id === activeTabIdRef.current)
      if (idx <= 0) return prev
      const leftIds = new Set(ordered.slice(0, idx).map((tab) => tab.id))
      const closableIds = new Set(getBulkClosableTabIds(prev, (tab) => leftIds.has(tab.id)))
      if (closableIds.size === 0) return prev
      closableIds.forEach((id) => { delete undoHistoryRef.current[id] })
      setFileHandles((existing) => {
        const next = { ...existing }
        closableIds.forEach((id) => { delete next[id] })
        return next
      })
      return prev.filter((tab) => !closableIds.has(tab.id))
    })
  }, [])

  const handleCloseAllToRight = useCallback(() => {
    setTabs((prev) => {
      const ordered = getOrderedTabs(prev)
      const idx = ordered.findIndex((t) => t.id === activeTabIdRef.current)
      if (idx === -1 || idx === ordered.length - 1) return prev
      const rightIds = new Set(ordered.slice(idx + 1).map((tab) => tab.id))
      const closableIds = new Set(getBulkClosableTabIds(prev, (tab) => rightIds.has(tab.id)))
      if (closableIds.size === 0) return prev
      closableIds.forEach((id) => { delete undoHistoryRef.current[id] })
      setFileHandles((existing) => {
        const next = { ...existing }
        closableIds.forEach((id) => { delete next[id] })
        return next
      })
      return prev.filter((tab) => !closableIds.has(tab.id))
    })
  }, [])

  const handleCloseAllUnchanged = useCallback(() => {
    setTabs((prev) => {
      const remaining = prev.filter((t) => t.modified || t.pinned)
      if (remaining.length === 0) {
        const newId = nextTabId++
        undoHistoryRef.current[newId] = { stack: [''], index: 0, savedIndex: 0 }
        const toRemove = prev
        toRemove.forEach((t) => { delete undoHistoryRef.current[t.id] })
        setActiveTabId(newId)
        setFileHandles({})
        return [{ id: newId, name: `new ${newId}`, content: '', modified: false, language: null, pinned: false, pinOrder: null }]
      }
      const toRemove = prev.filter((t) => !t.modified && !t.pinned)
      toRemove.forEach((t) => { delete undoHistoryRef.current[t.id] })
      setFileHandles((existing) => {
        const next = { ...existing }
        toRemove.forEach((tab) => { delete next[tab.id] })
        return next
      })
      if (!remaining.find((t) => t.id === activeTabIdRef.current)) {
        setActiveTabId(remaining[0].id)
      }
      return remaining
    })
  }, [])

  const handleSaveSession = useCallback(() => {
    const session = {
      version: 1,
      tabs: tabsRef.current.map((t) => ({
        name: t.name,
        content: t.content,
        language: t.language ?? null,
        ...normalizePinnedState(t),
      })),
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
      ...normalizePinnedState(t),
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
      window.open(url, '_blank', 'noopener,noreferrer')
    } else {
      window.open(url, '_blank', 'noopener,noreferrer,width=1200,height=800')
    }
  }, [])

  const handleExit = useCallback(() => {
    handleBrowserExit(window)
  }, [])

  const handleNextTab = useCallback(() => {
    if (activeView === 1) {
      const currentTabs = getOrderedTabs(tabsRef.current)
      const idx = currentTabs.findIndex((t) => t.id === activeTabIdRef.current)
      if (idx === -1 || currentTabs.length <= 1) return
      const nextIdx = (idx + 1) % currentTabs.length
      setActiveTabId(currentTabs[nextIdx].id)
    } else {
      const currentTabs = getOrderedTabs(view2TabsRef.current)
      const idx = currentTabs.findIndex((t) => t.id === view2ActiveTabIdRef.current)
      if (idx === -1 || currentTabs.length <= 1) return
      const nextIdx = (idx + 1) % currentTabs.length
      setView2ActiveTabId(currentTabs[nextIdx].id)
    }
  }, [activeView])

  const handlePrevTab = useCallback(() => {
    if (activeView === 1) {
      const currentTabs = getOrderedTabs(tabsRef.current)
      const idx = currentTabs.findIndex((t) => t.id === activeTabIdRef.current)
      if (idx === -1 || currentTabs.length <= 1) return
      const prevIdx = (idx - 1 + currentTabs.length) % currentTabs.length
      setActiveTabId(currentTabs[prevIdx].id)
    } else {
      const currentTabs = getOrderedTabs(view2TabsRef.current)
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
      setTabs((prev) => {
        const pinned = prev.filter((tab) => tab.pinned)
        const unpinned = prev.filter((tab) => !tab.pinned)
        return [...pinned, ...unpinned.sort(sortFn)]
      })
    } else {
      setView2Tabs((prev) => {
        const pinned = prev.filter((tab) => tab.pinned)
        const unpinned = prev.filter((tab) => !tab.pinned)
        return [...pinned, ...unpinned.sort(sortFn)]
      })
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
      setTabs((prev) => [...prev, { id, name: file.name, content, modified: false, language: detectLanguage(file.name), pinned: false, pinOrder: null }])
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

  const handleOpenAsWebpage = useCallback(() => {
    const sourceTab = getActiveTabRecord()
    if (!sourceTab) return
    const id = nextTabId++
    const webPreviewTab = createWebPreviewTab(sourceTab, id)
    if (!webPreviewTab) return
    if (activeView === 1) {
      setTabs((prev) => [...prev, webPreviewTab])
      setActiveTabId(id)
    } else {
      setView2Tabs((prev) => [...prev, webPreviewTab])
      setView2ActiveTabId(id)
    }
  }, [activeView, getActiveTabRecord])

  const handleFileAction = useCallback(
    (action) => {
      switch (action) {
        case 'new': handleNewTab(); break
        case 'open': handleOpen(); break
        case 'openAsWebpage': handleOpenAsWebpage(); break
        case 'reload': handleReload(); break
        case 'save': handleSave(); break
        case 'saveAs': handleSaveAs(); break
        case 'saveCopyAs': handleSaveCopyAs(); break
        case 'saveAll': handleSaveAll(); break
        case 'rename': handleRename(); break
        case 'closeActive': handleCloseActive(); break
        case 'closeAll': handleCloseAll(); break
        case 'closeAllButActive': handleCloseAllButActive(); break
        case 'closeAllButPinned': handleCloseAllButPinned(); break
        case 'closeAllToLeft': handleCloseAllToLeft(); break
        case 'closeAllToRight': handleCloseAllToRight(); break
        case 'closeAllUnchanged': handleCloseAllUnchanged(); break
        case 'loadSession': handleLoadSession(); break
        case 'saveSession': handleSaveSession(); break
        case 'print': handlePrint(); break
        case 'printNow': handlePrint(); break
        case 'exit': handleExit(); break
        case 'about': setAboutDialogOpen(true); break
        case 'preferences': setPreferencesOpen(true); break
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
      handleOpenAsWebpage,
      handleSaveAs, handleSaveCopyAs, handleSaveAll, handleRename,
      handleCloseActive, handleCloseAll, handleCloseAllButActive, handleCloseAllButPinned,
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

  const handleEditor1Scroll = useCallback((scrollTop, scrollLeft, scrollHeight, clientHeight) => {
    if (activeView === 1 && scrollHeight > 0) {
      setDocMapScrollInfo({ scrollTop, scrollHeight, clientHeight })
    }
    if (!splitEnabled || syncScrollingRef.current) return
    if (!syncScrollV && !syncScrollH) return
    syncScrollingRef.current = true
    secondEditorRef.current?.setScrollPosition(
      syncScrollV ? scrollTop : null,
      syncScrollH ? scrollLeft : null
    )
    requestAnimationFrame(() => { syncScrollingRef.current = false })
  }, [splitEnabled, syncScrollV, syncScrollH, activeView])

  const handleEditor2Scroll = useCallback((scrollTop, scrollLeft, scrollHeight, clientHeight) => {
    if (activeView === 2 && scrollHeight > 0) {
      setDocMapScrollInfo({ scrollTop, scrollHeight, clientHeight })
    }
    if (!splitEnabled || syncScrollingRef.current) return
    if (!syncScrollV && !syncScrollH) return
    syncScrollingRef.current = true
    editorRef.current?.setScrollPosition(
      syncScrollV ? scrollTop : null,
      syncScrollH ? scrollLeft : null
    )
    requestAnimationFrame(() => { syncScrollingRef.current = false })
  }, [splitEnabled, syncScrollV, syncScrollH, activeView])

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
      case 'document-map':
        setDocMapOpen((prev) => !prev)
        break
      case 'function-list':
        setFuncListOpen((prev) => !prev)
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
      case 'mark-prompt': {
        const term = window.prompt('Mark lines containing:', searchStateRef.current.term ?? '')
        if (term == null) break
        const styleRaw = window.prompt('Mark style (1-5):', '1')
        if (styleRaw == null) break
        const style = Number.parseInt(styleRaw, 10)
        if (Number.isNaN(style) || style < 1 || style > 5) {
          window.alert('Please choose a mark style from 1 to 5.')
          break
        }
        searchStateRef.current = { ...searchStateRef.current, term }
        getActiveEditor()?.markLinesByTerm?.(term, style)
        break
      }
      case 'bookmark-toggle':
        getActiveEditor()?.toggleBookmark?.()
        break
      case 'bookmark-next':
        getActiveEditor()?.nextBookmark?.()
        break
      case 'bookmark-prev':
        getActiveEditor()?.prevBookmark?.()
        break
      case 'bookmark-clear':
        getActiveEditor()?.clearBookmarks?.()
        break
      case 'bookmark-copy-lines':
        getActiveEditor()?.copyBookmarkedAndMarkedLines?.()
        break
      case 'bookmark-cut-lines':
        getActiveEditor()?.cutBookmarkedAndMarkedLines?.()
        break
      case 'bookmark-paste-lines': {
        if (navigator.clipboard?.readText) {
          navigator.clipboard.readText()
            .then((text) => {
              getActiveEditor()?.pasteToBookmarkedAndMarkedLines?.(text ?? '')
            })
            .catch(() => {})
        }
        break
      }
      case 'bookmark-remove-lines':
        getActiveEditor()?.removeBookmarkedAndMarkedLines?.()
        break
      case 'bookmark-remove-unmarked-lines':
        getActiveEditor()?.removeUnbookmarkedAndUnmarkedLines?.()
        break
      case 'bookmark-inverse':
        getActiveEditor()?.inverseBookmarks?.()
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
    appendMacroDebugLine('playback-start', { runCount, stepCount: macroSteps.length })
    isPlayingBackMacroRef.current = true
    try {
      for (let run = 0; run < runCount; run++) {
        // Track cursor position through cursor-relative steps to avoid reading
        // stale el.selectionStart on iOS WebKit after setRangeText. null means
        // use the live DOM value (first step of each run, or after a non-cursor
        // step that resets position).
        let trackedPos = null
        for (const step of macroSteps) {
          if (!step || typeof step.action !== 'string' || typeof step.menu !== 'string') continue
          appendMacroDebugLine('playback-step', { run: run + 1, step })
          switch (step.menu) {
            case 'Edit':
              dispatchEditAction(step.action, { record: false })
              trackedPos = null
              break
            case 'View':
              dispatchViewAction(step.action, { record: false })
              trackedPos = null
              break
            case 'Search':
              dispatchSearchAction(step.action, { record: false })
              trackedPos = null
              break
            case 'Language':
              dispatchLanguageAction(step.action, { record: false })
              trackedPos = null
              break
            case 'Tools':
              dispatchToolsAction(step.action, { record: false })
              trackedPos = null
              break
            case 'Macro': {
              // For cursor-relative steps, pass the tracked caret position so
              // each step anchors to where the previous step left the cursor
              // (not the stale DOM value, and NOT the recorded absolute position).
              const tp = Number.isFinite(trackedPos) ? trackedPos : undefined
              if (step.action === 'insert-text' && typeof step.text === 'string') {
                const np = getActiveEditor()?.insertText?.(step.text, tp, tp)
                trackedPos = np ?? null
              } else if (step.action === 'replace-selection' && typeof step.text === 'string') {
                // If the recorded step had a real selection (selStart !== selEnd), translate it
                // to cursor-relative offsets so we replace the correct span of text without
                // jumping to the absolute recorded position.  The cursor during recording was
                // at selEnd (right edge), so startOffset = selStart - selEnd (negative) and
                // endOffset = 0.  For caret-only steps (selStart === selEnd) the selection
                // offsets would both be 0, so just use replaceSelection at the tracked caret.
                if (Number.isFinite(step.selectionStart) && Number.isFinite(step.selectionEnd)
                  && step.selectionStart !== step.selectionEnd) {
                  const selectionSpan = step.selectionStart - step.selectionEnd  // negative: chars before cursor
                  const np = getActiveEditor()?.replaceRelative?.(selectionSpan, 0, step.text, tp)
                  trackedPos = np ?? null
                } else {
                  const np = getActiveEditor()?.replaceSelection?.(step.text, tp, tp)
                  trackedPos = np ?? null
                }
              } else if (step.action === 'delete-backward') {
                const np = getActiveEditor()?.deleteBackward?.(tp, tp)
                trackedPos = np ?? null
              } else if (step.action === 'delete-forward') {
                const np = getActiveEditor()?.deleteForward?.(tp, tp)
                trackedPos = np ?? null
              } else if (step.action === 'replace-relative'
                && Number.isFinite(step.startOffset)
                && Number.isFinite(step.endOffset)
                && typeof step.text === 'string') {
                const np = getActiveEditor()?.replaceRelative?.(step.startOffset, step.endOffset, step.text, tp)
                trackedPos = np ?? null
              } else if (step.action === 'replace-range'
                && Number.isFinite(step.start)
                && Number.isFinite(step.end)
                && typeof step.text === 'string') {
                if (Number.isFinite(step.selectionStart) && Number.isFinite(step.selectionEnd)) {
                  getActiveEditor()?.setSelection?.(step.selectionStart, step.selectionEnd)
                }
                getActiveEditor()?.replaceRange?.(step.start, step.end, step.text)
                trackedPos = null
              }
              break
            }
            default:
              trackedPos = null
              break
          }
        }
      }
    } finally {
      isPlayingBackMacroRef.current = false
      appendMacroDebugLine('playback-end')
    }
  }, [dispatchEditAction, dispatchViewAction, dispatchSearchAction, dispatchLanguageAction, dispatchToolsAction, getActiveEditor, appendMacroDebugLine])

  const handleMacroAction = useCallback((action) => {
    switch (action) {
      case 'macro-start-recording':
        if (isRecordingMacroRef.current) return
        currentMacroStepsRef.current = []
        hasStoppedRecordingMacroRef.current = false
        isRecordingMacroRef.current = true
        setCurrentMacroSteps([])
        setHasStoppedRecordingMacro(false)
        setIsRecordingMacro(true)
        break
      case 'macro-stop-recording':
        if (!isRecordingMacroRef.current) return
        isRecordingMacroRef.current = false
        hasStoppedRecordingMacroRef.current = true
        setIsRecordingMacro(false)
        setHasStoppedRecordingMacro(true)
        break
      case 'macro-playback':
        if (hasStoppedRecordingMacroRef.current || currentMacroStepsRef.current.length > 0) {
          playbackMacro(currentMacroStepsRef.current, 1)
          return
        }
        if (savedMacrosRef.current.length > 0) {
          playbackMacro(savedMacrosRef.current[0].steps, 1)
        }
        break
      case 'macro-save-current': {
        const steps = currentMacroStepsRef.current
        const hasRecordableMacro = hasStoppedRecordingMacroRef.current || steps.length > 0
        if (!hasRecordableMacro || isRecordingMacroRef.current) return
        const defaultName = `Recorded Macro ${savedMacrosRef.current.length + 1}`
        setSavedMacros((prev) => [...prev, { name: defaultName, steps: [...steps] }])
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
      } else if (ctrl && e.altKey && !e.shiftKey && key === 'p') {
        e.preventDefault()
        setPreferencesOpen(true)
      } else if (e.key === 'F2' && ctrl) {
        e.preventDefault()
        dispatchSearchAction('bookmark-toggle')
      } else if (e.key === 'F2' && e.shiftKey) {
        e.preventDefault()
        dispatchSearchAction('bookmark-prev')
      } else if (e.key === 'F2') {
        e.preventDefault()
        dispatchSearchAction('bookmark-next')
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
  }, [handleNewTab, handleNewWindow, handleOpen, handleSave, handleSaveAs, handleSaveAll, handlePrint, handleCloseActive, handleNextTab, handlePrevTab, dispatchViewAction, dispatchSearchAction, handleMacroAction])

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

  // Compute symbols for the Function List panel (memoised by content + language)
  const funcListSymbols = useMemo(
    () => (funcListOpen ? extractSymbols(displayContent, displayLanguage) : []),
    [funcListOpen, displayContent, displayLanguage]
  )

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
          iconSet={toolbarSettings.iconSet}
          iconColor={toolbarSettings.iconColor}
          iconMonochrome={toolbarSettings.iconMonochrome}
          customColor={toolbarSettings.customColor}
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
          onDocumentList={() => dispatchViewAction('document-list')}
          onDocumentMap={() => dispatchViewAction('document-map')}
          onMacroStartRecording={() => handleMacroAction('macro-start-recording')}
          onMacroStopRecording={() => handleMacroAction('macro-stop-recording')}
          onMacroPlayback={() => handleMacroAction('macro-playback')}
          onMacroRunMultiple={() => handleMacroAction('macro-run-multiple')}
          onMacroSaveCurrent={() => handleMacroAction('macro-save-current')}
          viewState={viewState}
          macroState={macroState}
        />
      )}
      <IncrementalSearch
        isOpen={incrementalSearchOpen}
        onClose={() => { setIncrementalSearchOpen(false); getActiveEditor()?.focus() }}
        onSearch={handleIncrementalSearch}
        onSearchNext={handleIncrementalSearchNext}
        onSearchPrev={handleIncrementalSearchPrev}
      />
      <div className={styles.editorRow}>
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
                    onTogglePin={handleToggleTabPin}
                  />
                )}
                {activeTab?.renderMode === 'webpage' ? (
                  <iframe
                    key={activeTabId}
                    title={`${activeTab?.name ?? 'untitled'} webpage preview`}
                    className={styles.webpagePreviewFrame}
                    srcDoc={activeTab?.content ?? ''}
                    sandbox="allow-scripts allow-forms allow-modals allow-pointer-lock allow-popups"
                  />
                ) : (
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
                )}
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
                    onTogglePin={handleToggleView2TabPin}
                  />
                )}
                {view2ActiveTab?.renderMode === 'webpage' ? (
                  <iframe
                    key={view2ActiveTabId ?? 'view2-empty'}
                    title={`${view2ActiveTab?.name ?? 'untitled'} webpage preview`}
                    className={styles.webpagePreviewFrame}
                    srcDoc={view2ActiveTab?.content ?? ''}
                    sandbox="allow-scripts allow-forms allow-modals allow-pointer-lock allow-popups"
                  />
                ) : (
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
                )}
              </div>
            }
          />
        ) : (
          <div className={styles.viewPane}>
            {!distractionFree && (
              <TabBar
                tabs={tabs}
                activeTabId={activeTabId}
                onSelect={setActiveTabId}
                onClose={handleCloseTab}
                onTogglePin={handleToggleTabPin}
              />
            )}
            {activeTab?.renderMode === 'webpage' ? (
              <iframe
                key={activeTabId}
                title={`${activeTab?.name ?? 'untitled'} webpage preview`}
                className={styles.webpagePreviewFrame}
                srcDoc={activeTab?.content ?? ''}
                sandbox="allow-scripts allow-forms allow-modals allow-pointer-lock allow-popups"
              />
            ) : (
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
            )}
          </div>
        )}
        {docMapOpen && !distractionFree && (
          <DocumentMapPanel
            content={displayContent}
            scrollTop={docMapScrollInfo.scrollTop}
            scrollHeight={docMapScrollInfo.scrollHeight}
            clientHeight={docMapScrollInfo.clientHeight}
            onNavigate={(top) => getActiveEditor()?.setScrollPosition(top, null)}
            onClose={() => setDocMapOpen(false)}
          />
        )}
        {funcListOpen && !distractionFree && (
          <FunctionListPanel
            symbols={funcListSymbols}
            language={displayLanguage}
            onJump={(lineNum) => getActiveEditor()?.goToLine(lineNum)}
            onClose={() => setFuncListOpen(false)}
          />
        )}
      </div>
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
      <PreferencesDialog
        isOpen={preferencesOpen}
        toolbarSettings={toolbarSettings}
        onApply={(settings) => setToolbarSettings(settings)}
        onClose={() => setPreferencesOpen(false)}
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
