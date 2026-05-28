import { useState, useRef, useEffect } from 'react';

function TabItem({ tab, isActive, isSecondary, onClick, onClose, onRename }) {
  const [hov,      setHov]      = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [draft,    setDraft]    = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (renaming) inputRef.current?.select();
  }, [renaming]);

  const startRename = e => {
    e.stopPropagation();
    setDraft(tab.filename);
    setRenaming(true);
  };

  const commitRename = () => {
    const name = draft.trim();
    if (name && name !== tab.filename) onRename(name);
    setRenaming(false);
  };

  const onKeyDown = e => {
    if (e.key === 'Enter') commitRename();
    if (e.key === 'Escape') setRenaming(false);
  };

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 4,
        padding: '0 8px 0 12px',
        borderRight: '1px solid #e2dedd',
        cursor: 'pointer', flexShrink: 0,
        minWidth: 80, maxWidth: 180,
        background: isActive ? '#fff' : (hov ? '#f3f0f8' : 'transparent'),
        borderBottom: `2px solid ${isActive ? '#9b85c4' : isSecondary ? '#c8c0d8' : 'transparent'}`,
      }}
    >
      {renaming ? (
        <input
          ref={inputRef}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commitRename}
          onKeyDown={onKeyDown}
          onClick={e => e.stopPropagation()}
          style={{
            flex: 1, fontSize: 11, fontFamily: "'DM Mono', monospace",
            background: '#f0edf8', border: '1px solid #c8c0d8', borderRadius: 2,
            color: '#2a2825', padding: '1px 4px', outline: 'none', minWidth: 0,
          }}
        />
      ) : (
        <span
          onDoubleClick={startRename}
          style={{
            flex: 1, fontSize: 11, color: isActive ? '#2a2825' : '#9a92a8',
            fontFamily: "'DM Mono', monospace",
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}
        >
          {tab.dirty ? '· ' : ''}{tab.filename}
        </span>
      )}
      <button
        onClick={e => { e.stopPropagation(); onClose(); }}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#c0b8cc', fontSize: 14, padding: '0 2px',
          opacity: hov ? 1 : 0, transition: 'opacity 0.1s', lineHeight: 1, flexShrink: 0,
        }}
      >×</button>
    </div>
  );
}

export function TabBar({ tabs, focusedId, leftTabId, rightTabId, focusedPane, onSelectTab, onCloseTab, onNewTab, onRenameTab }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'stretch',
      borderBottom: '1px solid #e2dedd', background: '#f7f6f4',
      flexShrink: 0, overflowX: 'auto', minHeight: 33,
    }}>
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
            onClick={() => onSelectTab(tab.id)}
            onClose={() => onCloseTab(tab.id)}
            onRename={name => onRenameTab(tab.id, name)}
          />
        );
      })}
      <button
        onClick={onNewTab}
        style={{
          padding: '0 14px', background: 'none', border: 'none',
          borderLeft: '1px solid #e5e0de', cursor: 'pointer',
          color: '#c0b8cc', fontSize: 18, flexShrink: 0, lineHeight: 1,
        }}
      >+</button>
    </div>
  );
}
