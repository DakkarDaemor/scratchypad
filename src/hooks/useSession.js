import { useState, useEffect } from 'react';
import { KEYS } from '../constants';
import { mkTab, initSession, nextFilename } from '../utils';

export function useSession() {
  const [tabs,        setTabs]        = useState(initSession.tabs);
  const [leftTabId,   setLeftTabId]   = useState(initSession.leftTabId);
  const [rightTabId,  setRightTabId]  = useState(initSession.rightTabId);
  const [focusedPane, setFocusedPane] = useState('left');

  const focusedId = (focusedPane === 'right' && rightTabId) ? rightTabId : leftTabId;

  useEffect(() => {
    localStorage.setItem(KEYS.SESSION, JSON.stringify({ tabs, leftTabId, rightTabId }));
  }, [tabs, leftTabId, rightTabId]);

  const getTab    = id  => tabs.find(t => t.id === id);
  const updateTab = (id, upd) => setTabs(prev => prev.map(t => t.id === id ? { ...t, ...upd } : t));

  const setFocusedTab = id => {
    if (focusedPane === 'right' && rightTabId) setRightTabId(id);
    else setLeftTabId(id);
  };

  const openInTab = (filename, text, fileId) => {
    const existing = fileId ? tabs.find(t => t.fileId === fileId) : null;
    if (existing) { setFocusedTab(existing.id); return; }
    const emptyPlaceholder = tabs.find(t => !t.fileId && !t.dirty && t.text === '' && t.filename === filename);
    if (emptyPlaceholder) {
      setTabs(prev => prev.map(t => t.id === emptyPlaceholder.id ? { ...t, text, fileId } : t));
      setFocusedTab(emptyPlaceholder.id);
      return;
    }
    const tab = mkTab(filename, text, fileId);
    setTabs(prev => [...prev, tab]);
    setFocusedTab(tab.id);
  };

  const addNewTab = () => {
    const taken = new Set(tabs.map(t => t.filename));
    const name = taken.has('scratch.txt') ? nextFilename('scratch.txt', taken) : 'scratch.txt';
    const t = mkTab(name);
    setTabs(prev => [...prev, t]);
    setFocusedTab(t.id);
  };

  const closeTab = id => {
    setTabs(prev => {
      const next = prev.filter(t => t.id !== id);
      if (next.length === 0) {
        const t = mkTab();
        setLeftTabId(t.id);
        setRightTabId(null);
        return [t];
      }
      if (leftTabId === id) {
        const fb = next.find(t => t.id !== rightTabId) || next[0];
        setLeftTabId(fb.id);
      }
      if (rightTabId === id) setRightTabId(null);
      return next;
    });
  };

  const toggleSplit = () => {
    if (rightTabId) { setRightTabId(null); setFocusedPane('left'); return; }
    const other = tabs.find(t => t.id !== leftTabId);
    if (other) { setRightTabId(other.id); setFocusedPane('right'); }
    else {
      const t = mkTab();
      setTabs(prev => [...prev, t]);
      setRightTabId(t.id);
      setFocusedPane('right');
    }
  };

  const getNextFilename = base => nextFilename(base, new Set(tabs.map(t => t.filename)));

  return {
    tabs, leftTabId, rightTabId, focusedPane, focusedId,
    setFocusedPane, setRightTabId,
    getTab, updateTab, setFocusedTab, openInTab, addNewTab, closeTab, toggleSplit, getNextFilename,
  };
}
