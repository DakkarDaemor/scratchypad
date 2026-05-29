import { useState, useRef, useEffect } from 'react';
import s from './TabBar.module.css';

const stripExt  = name => name.endsWith('.txt') ? name.slice(0, -4) : name;
const ensureExt = name => name.includes('.') ? name : name + '.txt';

function TabItem({ tab, isActive, isSecondary, isMobile, isDragging, isDragOver,
                   onClick, onClose, onRename,
                   onDragStart, onDragOver, onDrop, onDragEnd }) {
  const [renaming, setRenaming] = useState(false);
  const [draft,    setDraft]    = useState('');
  const inputRef = useRef(null);

  useEffect(() => { if (renaming) inputRef.current?.select(); }, [renaming]);

  const startRename = e => { e.stopPropagation(); setDraft(stripExt(tab.filename)); setRenaming(true); };

  const commitRename = () => {
    const raw = draft.trim();
    if (!raw) { setRenaming(false); return; }
    const name = ensureExt(raw);
    if (name !== tab.filename) onRename(name);
    setRenaming(false);
  };

  const onKeyDown = e => {
    if (e.key === 'Enter')  commitRename();
    if (e.key === 'Escape') setRenaming(false);
  };

  const cls = [s.tab, isActive && s.active, isSecondary && s.secondary,
               isMobile && s.mobile, isDragging && s.dragging, isDragOver && s.dragOver]
    .filter(Boolean).join(' ');

  return (
    <div
      onClick={onClick}
      className={cls}
      data-active={isActive || undefined}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      {tab.dirty && !renaming && <span className={s.dirty} />}
      {renaming ? (
        <input
          ref={inputRef}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commitRename}
          onKeyDown={onKeyDown}
          onClick={e => e.stopPropagation()}
          className={s.renameInput}
        />
      ) : (
        <span className={s.name} onDoubleClick={startRename}>{stripExt(tab.filename)}</span>
      )}
      <button onClick={e => { e.stopPropagation(); onClose(); }} className={s.closeBtn}>×</button>
    </div>
  );
}

export function TabBar({ tabs, focusedId, leftTabId, rightTabId, focusedPane, isMobile,
                         onSelectTab, onCloseTab, onNewTab, onRenameTab, onReorderTabs }) {
  const barRef = useRef(null);
  const [draggedId,  setDraggedId]  = useState(null);
  const [dragOverId, setDragOverId] = useState(null);

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    const el = bar.querySelector('[data-active]');
    el?.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
  }, [focusedId]);

  const startDrag = (e, id) => { e.dataTransfer.effectAllowed = 'move'; setDraggedId(id); };
  const overDrag  = (e, id) => { e.preventDefault(); if (id !== draggedId) setDragOverId(id); };
  const endDrag   = ()      => { setDraggedId(null); setDragOverId(null); };
  const drop      = (e, id) => {
    e.preventDefault();
    if (!draggedId || draggedId === id) { endDrag(); return; }
    const arr  = [...tabs];
    const from = arr.findIndex(t => t.id === draggedId);
    const to   = arr.findIndex(t => t.id === id);
    arr.splice(to, 0, arr.splice(from, 1)[0]);
    onReorderTabs(arr);
    endDrag();
  };

  return (
    <div ref={barRef} className={s.tabBar}>
      {tabs.map(tab => {
        const isActive    = tab.id === focusedId;
        const otherPaneId = focusedPane === 'left' ? rightTabId : leftTabId;
        const isSecondary = !!rightTabId && tab.id === otherPaneId;
        return (
          <TabItem
            key={tab.id}
            tab={tab}
            isActive={isActive}
            isSecondary={isSecondary}
            isMobile={isMobile}
            isDragging={tab.id === draggedId}
            isDragOver={tab.id === dragOverId}
            onClick={() => onSelectTab(tab.id)}
            onClose={() => onCloseTab(tab.id)}
            onRename={name => onRenameTab(tab.id, name)}
            onDragStart={e => startDrag(e, tab.id)}
            onDragOver={e => overDrag(e, tab.id)}
            onDrop={e => drop(e, tab.id)}
            onDragEnd={endDrag}
          />
        );
      })}
      <button onClick={onNewTab} className={s.newBtn}>+</button>
    </div>
  );
}
