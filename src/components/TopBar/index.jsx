import { useState, useRef, useEffect } from 'react';
import { IconBtn, Btn } from '../../ui';
import s from './TopBar.module.css';

export function TopBar({
  canToggleSidebar, sidebarOpen, onToggleSidebar,
  canSplit, hasSplit, onToggleSplit,
  loading, onSave, onOpenSettings,
  dictationMode, onToggleDictationMode, dictationSupported,
  onOpenFind, onOpenFindReplace,
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
        <IconBtn title="Toggle sidebar" active={sidebarOpen} onClick={onToggleSidebar} className={s.hamburger}>≡</IconBtn>
      )}
      <span className={s.title}>ScratchyPad</span>
      <div className={s.spacer} />
      {canSplit && (
        <IconBtn title={hasSplit ? 'Close split' : 'Split view'} active={hasSplit} onClick={onToggleSplit}>◫</IconBtn>
      )}
      <Btn onClick={onSave} disabled={loading} accent>{loading ? '…' : 'Save'}</Btn>
      <div className={s.menuWrap} ref={menuRef}>
        <Btn
          onClick={() => setMenuOpen(o => !o)}
          style={{ fontSize: 17, lineHeight: '15px', position: 'relative' }}
        >
          ⚙{dictationMode && <span className={s.badge} />}
        </Btn>
        {menuOpen && (
          <div className={s.menu}>
            <button className={s.menuItem} onClick={() => { onOpenFind(); setMenuOpen(false); }}>
              🔍 Find
            </button>
            <button className={s.menuItem} onClick={() => { onOpenFindReplace(); setMenuOpen(false); }}>
              ↔ Find &amp; Replace
            </button>
            <button className={s.menuItem} onClick={() => { onOpenSettings(); setMenuOpen(false); }}>
              ⚙ Settings
            </button>
            {dictationSupported && (
              <button
                className={`${s.menuItem}${dictationMode ? ` ${s.menuItemOn}` : ''}`}
                onClick={() => { onToggleDictationMode(); setMenuOpen(false); }}
              >
                <span className={s.menuItemLabel}>🎤 Dictaphone</span>
                <span className={`${s.switch} ${dictationMode ? s.switchOn : ''}`} />
              </button>
            )}
            <div className={s.menuSep} />
            <div className={s.menuAbout}>
              <span className={s.menuAboutName}>ScratchyPad <span className={s.menuAboutVersion}>v0.1.0</span></span>
              <span className={s.menuAboutCredit}>by Fabio &amp; Claude</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
