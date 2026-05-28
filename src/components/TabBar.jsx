import { useState } from 'react';

function TabItem({ tab, isActive, isSecondary, onClick, onClose }) {
  const [hov, setHov] = useState(false);
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
        minWidth: 80, maxWidth: 160,
        background: isActive ? '#fff' : (hov ? '#f3f0f8' : 'transparent'),
        borderBottom: `2px solid ${isActive ? '#9b85c4' : isSecondary ? '#c8c0d8' : 'transparent'}`,
      }}
    >
      <span style={{
        flex: 1, fontSize: 11, color: isActive ? '#2a2825' : '#9a92a8',
        fontFamily: "'DM Mono', monospace",
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {tab.dirty ? '· ' : ''}{tab.filename}
      </span>
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

export function TabBar({ tabs, focusedId, leftTabId, rightTabId, focusedPane, onSelectTab, onCloseTab, onNewTab }) {
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
