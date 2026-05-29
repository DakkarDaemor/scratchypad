import { IconBtn, Btn } from './ui';

const STATUS_COLOR = { ok: '#6aa4bc', err: '#c46a6a', warn: '#9b85c4', info: '#9b85c4' };

export function TopBar({ sidebarOpen, onToggleSidebar, status, canSplit, hasSplit, onToggleSplit, loading, onSave, onOpenSettings }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '8px 12px', borderBottom: '1px solid #e2dedd',
      background: '#f1f0ee', flexShrink: 0,
    }}>
      <IconBtn title="Toggle sidebar" active={sidebarOpen} onClick={onToggleSidebar}>≡</IconBtn>
      <span style={{ fontSize: 15, fontWeight: 500, color: '#9b85c4', userSelect: 'none' }}>ScratchyPad</span>
      <div style={{ flex: 1 }} />
      {status.msg && (
        <span style={{ fontSize: 11, color: STATUS_COLOR[status.type] }}>{status.msg}</span>
      )}
      {canSplit && (
        <IconBtn title={hasSplit ? 'Close split' : 'Split view'} active={hasSplit} onClick={onToggleSplit}>◫</IconBtn>
      )}
      <Btn onClick={onSave} disabled={loading} accent>{loading ? '…' : 'Save'}</Btn>
      <Btn onClick={onOpenSettings} style={{ fontSize: 17, lineHeight: '15px' }}>⚙</Btn>
    </div>
  );
}
