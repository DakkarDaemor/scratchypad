import { STATUS_COLOR } from '../constants';
import { IconBtn, Btn } from './ui';
import s from './TopBar.module.css';

export function TopBar({ sidebarOpen, onToggleSidebar, status, canSplit, hasSplit, onToggleSplit, loading, onSave, onOpenSettings }) {
  return (
    <div className={s.bar}>
      <IconBtn title="Toggle sidebar" active={sidebarOpen} onClick={onToggleSidebar}>≡</IconBtn>
      <span className={s.title}>ScratchyPad</span>
      <div className={s.spacer} />
      {status.msg && (
        <span className={s.status} style={{ color: STATUS_COLOR[status.type] }}>{status.msg}</span>
      )}
      {canSplit && (
        <IconBtn title={hasSplit ? 'Close split' : 'Split view'} active={hasSplit} onClick={onToggleSplit}>◫</IconBtn>
      )}
      <Btn onClick={onSave} disabled={loading} accent>{loading ? '…' : 'Save'}</Btn>
      <Btn onClick={onOpenSettings} style={{ fontSize: 17, lineHeight: '15px' }}>⚙</Btn>
    </div>
  );
}
