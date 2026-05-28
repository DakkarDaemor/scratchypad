import { useState } from 'react';
import { IconBtn } from './ui';

function SidebarFile({ name, open, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding: '5px 8px', cursor: 'pointer', borderRadius: 3,
        fontSize: 11, fontFamily: "'DM Mono', monospace",
        color: open ? '#9b85c4' : '#6a6278',
        background: hov ? '#e4dff5' : (open ? '#ece8f5' : 'transparent'),
        marginBottom: 2, transition: 'all 0.1s',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}
    >{name}</div>
  );
}

export function Sidebar({ isMobile, files, loading, openTabFileIds, onClose, onRefresh, onOpenFile, onNewTab }) {
  return (
    <div style={{
      width: isMobile ? '100%' : 220,
      position: isMobile ? 'absolute' : 'relative',
      inset: isMobile ? 0 : 'auto',
      zIndex: isMobile ? 100 : 'auto',
      background: '#f0edf8', borderRight: '1px solid #dbd5e8',
      display: 'flex', flexDirection: 'column',
      flexShrink: 0, overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center',
        padding: '8px 10px', borderBottom: '1px solid #dbd5e8', gap: 4,
      }}>
        <span style={{ flex: 1, fontSize: 9, fontWeight: 500, color: '#9b85c4', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Files
        </span>
        <IconBtn title="Refresh" onClick={onRefresh} disabled={loading}>↻</IconBtn>
        <IconBtn title="Close" onClick={onClose}>×</IconBtn>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 8px' }}>
        {loading
          ? <div style={{ fontSize: 11, color: '#b0a8c0', padding: 8 }}>Loading…</div>
          : files.length === 0
            ? <div style={{ fontSize: 11, color: '#b0a8c0', padding: 8 }}>No files yet.</div>
            : files.map(f => (
                <SidebarFile
                  key={f.id}
                  name={f.name}
                  open={openTabFileIds.has(f.id)}
                  onClick={() => onOpenFile(f.id, f.name)}
                />
              ))
        }
      </div>

      <button
        onClick={onNewTab}
        style={{
          margin: '8px', padding: '6px 0',
          background: 'none', border: '1px dashed #c8c0d8',
          color: '#9b85c4', borderRadius: 4, cursor: 'pointer', fontSize: 11,
        }}
      >+ New file</button>
    </div>
  );
}
