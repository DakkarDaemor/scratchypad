import { renderHook, act } from '@testing-library/react'
import { useSession } from '../hooks/useSession'

// initSession is a module-level IIFE that runs once at import time with an
// empty localStorage (clean jsdom state), so every renderHook call in this
// file starts from the same initial state: one empty 'scratch.md' tab.
beforeEach(() => { localStorage.clear() })

// ---------------------------------------------------------------------------
// openInTab
// ---------------------------------------------------------------------------
describe('useSession — openInTab', () => {
  it('deduplicates by fileId: focuses existing tab without creating a new one', () => {
    const { result } = renderHook(() => useSession())

    act(() => { result.current.openInTab('doc.md', 'content', 'gd_abc') })
    const tabCount = result.current.tabs.length
    const focusedId = result.current.focusedId

    act(() => { result.current.openInTab('doc.md', 'content', 'gd_abc') }) // same fileId

    expect(result.current.tabs).toHaveLength(tabCount)
    expect(result.current.focusedId).toBe(focusedId)
  })

  it('reuses an empty placeholder tab (same filename, empty, no fileId) instead of adding a new one', () => {
    const { result } = renderHook(() => useSession())
    const initialId = result.current.tabs[0].id // scratch.md, text='', fileId=null

    act(() => { result.current.openInTab('scratch.md', 'new content', 'gd_xyz') })

    expect(result.current.tabs).toHaveLength(1)
    expect(result.current.tabs[0].id).toBe(initialId)        // same tab, updated in-place
    expect(result.current.tabs[0].text).toBe('new content')
    expect(result.current.tabs[0].fileId).toBe('gd_xyz')
  })

  it('creates a new tab when no suitable empty placeholder exists', () => {
    const { result } = renderHook(() => useSession())

    act(() => { result.current.updateTab(result.current.tabs[0].id, { dirty: true }) })
    act(() => { result.current.openInTab('notes.md', 'content', 'gd_789') })

    expect(result.current.tabs).toHaveLength(2)
  })
})

// ---------------------------------------------------------------------------
// closeTab
// ---------------------------------------------------------------------------
describe('useSession — closeTab', () => {
  it('recreates a fresh empty tab when the last tab is closed', () => {
    const { result } = renderHook(() => useSession())
    const originalId = result.current.tabs[0].id

    act(() => { result.current.closeTab(originalId) })

    expect(result.current.tabs).toHaveLength(1)
    expect(result.current.tabs[0].id).not.toBe(originalId)
    expect(result.current.tabs[0].text).toBe('')
    expect(result.current.leftTabId).toBe(result.current.tabs[0].id)
    expect(result.current.rightTabId).toBeNull()
  })

  it('moves leftTabId to another tab when the active left tab is closed', () => {
    const { result } = renderHook(() => useSession())

    act(() => { result.current.addNewTab() })

    const closedId = result.current.leftTabId

    act(() => { result.current.closeTab(closedId) })

    expect(result.current.tabs.find(t => t.id === closedId)).toBeUndefined()
    expect(result.current.leftTabId).not.toBe(closedId)
  })

  it('clears rightTabId when the right-pane tab is closed', () => {
    const { result } = renderHook(() => useSession())

    act(() => { result.current.toggleSplit() }) // creates second tab as right pane
    const rightId = result.current.rightTabId
    expect(rightId).not.toBeNull()

    act(() => { result.current.closeTab(rightId) })

    expect(result.current.rightTabId).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// addNewTab
// ---------------------------------------------------------------------------
describe('useSession — addNewTab', () => {
  it('generates a unique filename when scratch.md is already taken', () => {
    const { result } = renderHook(() => useSession())
    // Initial state already contains 'scratch.md'

    act(() => { result.current.addNewTab() })

    const names = result.current.tabs.map(t => t.filename)
    expect(names).toContain('scratch_2.md')
    expect(new Set(names).size).toBe(names.length) // no duplicates
  })
})

// ---------------------------------------------------------------------------
// toggleSplit
// ---------------------------------------------------------------------------
describe('useSession — toggleSplit', () => {
  it('creates a new second tab and opens split when only one tab exists', () => {
    const { result } = renderHook(() => useSession())

    expect(result.current.rightTabId).toBeNull()

    act(() => { result.current.toggleSplit() })

    expect(result.current.rightTabId).not.toBeNull()
    expect(result.current.focusedPane).toBe('right')
    expect(result.current.tabs).toHaveLength(2)
  })

  it('reuses the existing second tab instead of creating a new one', () => {
    const { result } = renderHook(() => useSession())
    const firstTabId = result.current.tabs[0].id

    act(() => { result.current.addNewTab() }) // leftTabId now points to the new tab

    act(() => { result.current.toggleSplit() })

    // toggleSplit picks tabs.find(t => t.id !== leftTabId) = the original first tab
    expect(result.current.rightTabId).toBe(firstTabId)
    expect(result.current.tabs).toHaveLength(2) // no extra tab created
  })

  it('closes split and resets focusedPane to left when toggled again', () => {
    const { result } = renderHook(() => useSession())

    act(() => { result.current.toggleSplit() })
    expect(result.current.rightTabId).not.toBeNull()

    act(() => { result.current.toggleSplit() })

    expect(result.current.rightTabId).toBeNull()
    expect(result.current.focusedPane).toBe('left')
  })
})
