import test from 'node:test'
import assert from 'node:assert/strict'
import { getOrderedTabs, setTabPinned, getBulkClosableTabIds, shouldPersistAutosaveTab, normalizePinnedState } from './pinnedTabs.mjs'

test('getOrderedTabs keeps pinned tabs first by pin order', () => {
  const tabs = [
    { id: 1, name: 'a.txt', pinned: false },
    { id: 2, name: 'b.txt', pinned: true, pinOrder: 2 },
    { id: 3, name: 'c.txt', pinned: true, pinOrder: 1 },
    { id: 4, name: 'd.txt', pinned: false },
  ]
  assert.deepEqual(getOrderedTabs(tabs).map((tab) => tab.id), [3, 2, 1, 4])
})

test('setTabPinned appends newly pinned tab to pinned region', () => {
  const tabs = [
    { id: 1, name: 'a.txt', pinned: true, pinOrder: 1 },
    { id: 2, name: 'b.txt', pinned: false },
    { id: 3, name: 'c.txt', pinned: true, pinOrder: 2 },
  ]
  const next = setTabPinned(tabs, 2, true)
  assert.deepEqual(getOrderedTabs(next).filter((tab) => tab.pinned).map((tab) => tab.id), [1, 3, 2])
  assert.equal(next.find((tab) => tab.id === 2)?.pinOrder, 3)
})

test('getBulkClosableTabIds excludes pinned tabs by default', () => {
  const tabs = [
    { id: 1, name: 'a.txt', pinned: true, pinOrder: 1, modified: false },
    { id: 2, name: 'b.txt', pinned: false, modified: false },
    { id: 3, name: 'c.txt', pinned: false, modified: true },
  ]
  assert.deepEqual(getBulkClosableTabIds(tabs), [2, 3])
  assert.deepEqual(getBulkClosableTabIds(tabs, (tab) => !tab.modified), [2])
})

test('persistence helpers keep pinned tabs and sanitize pin metadata', () => {
  assert.equal(shouldPersistAutosaveTab({ modified: false, pinned: true }), true)
  assert.equal(shouldPersistAutosaveTab({ modified: false, pinned: false }), false)
  assert.deepEqual(normalizePinnedState({ pinned: 1, pinOrder: 'bad' }), { pinned: true, pinOrder: null })
  assert.deepEqual(normalizePinnedState({ pinned: false, pinOrder: 3 }), { pinned: false, pinOrder: 3 })
})
