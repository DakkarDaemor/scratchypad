import { useState, useRef, useEffect } from 'react';
import s from './TabBar.module.css';

const stripExt  = name => name.endsWith('.txt') ? name.slice(0, -4) : name;
const ensureExt = name => name.includes('.') ? name : name + '.txt';

function TabItem({ tab, isActive, isSecondary, isMobile, onClick, onClose, onRename }) {
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

  const cls = [s.tab, isActive && s.active, isSecondary && s.secondary, isMobile && s.mobile]
    .filter(Boolean).join(' ');

  return (
    <div onClick={onClick} className={cls}>
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

export function TabBar({ tabs, focusedId, leftTabId, rightTabId, focusedPane, isMobile, onSelectTab, onCloseTab, onNewTab, onRenameTab }) {
  return (
    <div className={s.tabBar}>
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
            onClick={() => onSelectTab(tab.id)}
            onClose={() => onCloseTab(tab.id)}
            onRename={name => onRenameTab(tab.id, name)}
          />
        );
      })}
      <button onClick={onNewTab} className={s.newBtn}>+</button>
    </div>
  );
}
