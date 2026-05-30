import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { TAB_COLORS } from '../../constants';
import s from './TabBar.module.css';

const stripExt  = name => name.endsWith('.md') ? name.slice(0, -3) : name.endsWith('.txt') ? name.slice(0, -4) : name;
const ensureExt = name => name.includes('.') ? name : name + '.md';

function TabItem({ tab, isActive, isSecondary, isMobile, isDragging, isDragOver,
                   onClick, onClose,
                   onDragStart, onDragOver, onDrop, onDragEnd }) {
  const cls = [s.tab, isActive && s.active, isSecondary && s.secondary,
               isMobile && s.mobile, isDragging && s.dragging, isDragOver && s.dragOver]
    .filter(Boolean).join(' ');

  const colorStyle = tab.color ? {
    borderLeft: `3px solid ${tab.color}`,
    background: isActive
      ? `linear-gradient(to right, ${tab.color}50 0%, transparent 70%)`
      : `linear-gradient(to right, ${tab.color}28 0%, transparent 70%)`,
  } : {};

  return (
    <div
      onClick={e => onClick(e.currentTarget)}
      className={cls}
      style={colorStyle}
      data-active={isActive || undefined}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      {tab.dirty && <span className={s.dirty} />}
      <span className={s.name}>{stripExt(tab.filename)}</span>
      <button onClick={e => { e.stopPropagation(); onClose(); }} className={s.closeBtn}>×</button>
    </div>
  );
}

export function TabBar({ tabs, focusedId, leftTabId, rightTabId, focusedPane, isMobile,
                         onSelectTab, onCloseTab, onNewTab, onRenameTab, onReorderTabs, onColorTab }) {
  const barRef      = useRef(null);
  const popoverRef  = useRef(null);
  const lastTapRef  = useRef({ tabId: null, time: 0 });
  const [draggedId,  setDraggedId]  = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const [popover,    setPopover]    = useState(null); // { tabId, x, y, draftName, color }

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    const el = bar.querySelector('[data-active]');
    el?.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
  }, [focusedId]);

  useEffect(() => {
    if (!popover) return;
    const h = e => { if (!popoverRef.current?.contains(e.target)) setPopover(null); };
    document.addEventListener('mousedown', h);
    document.addEventListener('touchstart', h);
    return () => { document.removeEventListener('mousedown', h); document.removeEventListener('touchstart', h); };
  }, [!!popover]);

  useLayoutEffect(() => {
    if (!popover || !popoverRef.current) return;
    const { width } = popoverRef.current.getBoundingClientRect();
    const clamped = Math.max(8, Math.min(popover.x, window.innerWidth - width - 8));
    if (clamped !== popover.x) setPopover(p => p ? { ...p, x: clamped } : p);
  }, [popover?.tabId]);

  const openPopover = (tab, rect) => {
    setPopover({ tabId: tab.id, x: rect.left, y: rect.bottom + 4, draftName: stripExt(tab.filename), color: tab.color || null });
  };

  const commitPopoverRename = () => {
    if (!popover) return;
    const raw = popover.draftName.trim();
    if (!raw) return;
    const name = ensureExt(raw);
    const tab = tabs.find(t => t.id === popover.tabId);
    if (tab && name !== tab.filename) onRenameTab(popover.tabId, name);
  };

  const handleTabClick = (tab, el) => {
    const now  = Date.now();
    const last = lastTapRef.current;
    if (last.tabId === tab.id && now - last.time < 350) {
      openPopover(tab, el.getBoundingClientRect());
      lastTapRef.current = { tabId: null, time: 0 };
    } else {
      onSelectTab(tab.id);
      lastTapRef.current = { tabId: tab.id, time: now };
    }
  };

  const startDrag = (e, id) => { e.dataTransfer.effectAllowed = 'move'; setDraggedId(id); };
  const overDrag  = (e, id) => { e.preventDefault(); if (id !== draggedId) setDragOverId(id); };
  const endDrag   = () => { setDraggedId(null); setDragOverId(null); };
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
            onClick={(el) => handleTabClick(tab, el)}
            onClose={() => onCloseTab(tab.id)}
            onDragStart={e => startDrag(e, tab.id)}
            onDragOver={e => overDrag(e, tab.id)}
            onDrop={e => drop(e, tab.id)}
            onDragEnd={endDrag}
          />
        );
      })}
      <button onClick={onNewTab} className={s.newBtn}>+</button>

      {popover && (
        <div
          ref={popoverRef}
          className={s.popover}
          style={{ top: popover.y, left: popover.x }}
        >
          <input
            autoFocus
            className={s.popoverInput}
            value={popover.draftName}
            onChange={e => setPopover(p => ({ ...p, draftName: e.target.value }))}
            onKeyDown={e => {
              if (e.key === 'Enter')  { commitPopoverRename(); setPopover(null); }
              if (e.key === 'Escape') setPopover(null);
            }}
          />
          <div className={s.swatches}>
            <button
              className={`${s.swatch} ${s.swatchNone} ${!popover.color ? s.swatchSelected : ''}`}
              onMouseDown={e => e.preventDefault()}
              onClick={() => { onColorTab(popover.tabId, null); setPopover(p => ({ ...p, color: null })); }}
              title="Nessun colore"
            />
            {TAB_COLORS.map(c => (
              <button
                key={c}
                className={`${s.swatch} ${popover.color === c ? s.swatchSelected : ''}`}
                style={{ background: c }}
                onMouseDown={e => e.preventDefault()}
                onClick={() => { onColorTab(popover.tabId, c); setPopover(p => ({ ...p, color: c })); }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
