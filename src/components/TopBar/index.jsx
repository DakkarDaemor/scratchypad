import { useState, useRef, useEffect } from 'react';
import { STATUS_COLOR } from '../../constants';
import { IconBtn, Btn } from '../../ui';
import s from './TopBar.module.css';

export function TopBar({
  canToggleSidebar, sidebarOpen, onToggleSidebar,
  status, canSplit, hasSplit, onToggleSplit,
  loading, onSave, onOpenSettings,
  dictationActive, onToggleDictation, dictationSupported,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const h = e => { if (!menuRef.current?.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [menuOpen]);

  return (
    <div className={s.bar}>
      {canToggleSidebar && (
        <IconBtn title="Toggle sidebar" active={sidebarOpen} onClick={onToggleSidebar}>≡</IconBtn>
      )}
      <span className={s.title}>ScratchyPad</span>
      <div className={s.spacer} />
      {status.msg && (
        <span className={s.status} style={{ color: STATUS_COLOR[status.type] }}>{status.msg}</span>
      )}
      {canSplit && (
        <IconBtn title={hasSplit ? 'Close split' : 'Split view'} active={hasSplit} onClick={onToggleSplit}>◫</IconBtn>
      )}
      <Btn onClick={onSave} disabled={loading} accent>{loading ? '…' : 'Save'}</Btn>
      <div className={s.menuWrap} ref={menuRef}>
        <Btn
          onClick={() => setMenuOpen(o => !o)}
          style={{ fontSize: 17, lineHeight: '15px', position: 'relative' }}
        >
          ⚙{dictationActive && <span className={s.badge} />}
        </Btn>
        {menuOpen && (
          <div className={s.menu}>
            <button className={s.menuItem} onClick={() => { onOpenSettings(); setMenuOpen(false); }}>
              ⚙ Settings
            </button>
            {dictationSupported && (
              <button
                className={`${s.menuItem}${dictationActive ? ` ${s.menuItemOn}` : ''}`}
                onClick={() => { onToggleDictation(); setMenuOpen(false); }}
              >
                {dictationActive ? '🎤 Stop dettatura' : '🎤 Dettatura'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
