export function getOrderedTabs(tabs) {
  return tabs
    .map((tab, index) => ({ tab, index }))
    .sort((a, b) => {
      const aPinned = Boolean(a.tab.pinned)
      const bPinned = Boolean(b.tab.pinned)
      if (aPinned !== bPinned) return aPinned ? -1 : 1
      if (aPinned && bPinned) {
        const aOrder = Number.isFinite(a.tab.pinOrder) ? a.tab.pinOrder : Number.MAX_SAFE_INTEGER
        const bOrder = Number.isFinite(b.tab.pinOrder) ? b.tab.pinOrder : Number.MAX_SAFE_INTEGER
        if (aOrder !== bOrder) return aOrder - bOrder
      }
      return a.index - b.index
    })
    .map(({ tab }) => tab)
}

export function setTabPinned(tabs, id, pinned) {
  if (pinned) {
    const maxPinOrder = tabs.reduce((max, tab) => {
      if (!tab.pinned || !Number.isFinite(tab.pinOrder)) return max
      return Math.max(max, tab.pinOrder)
    }, 0)
    return tabs.map((tab) => {
      if (tab.id !== id) return tab
      if (tab.pinned) return tab
      return { ...tab, pinned: true, pinOrder: maxPinOrder + 1 }
    })
  }
  return tabs.map((tab) => {
    if (tab.id !== id || !tab.pinned) return tab
    return { ...tab, pinned: false, pinOrder: null }
  })
}

export function getBulkClosableTabIds(tabs, predicate = null) {
  return getOrderedTabs(tabs)
    .filter((tab) => !tab.pinned && (!predicate || predicate(tab)))
    .map((tab) => tab.id)
}

export function shouldPersistAutosaveTab(tab) {
  return Boolean(tab?.modified || tab?.pinned)
}

export function normalizePinnedState(tab) {
  const pinned = Boolean(tab?.pinned)
  return {
    pinned,
    pinOrder: pinned && Number.isFinite(tab?.pinOrder) ? tab.pinOrder : null,
  }
}
