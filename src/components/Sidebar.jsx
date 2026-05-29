import { IconBtn } from '../ui';
import s from './Sidebar.module.css';

function SidebarFile({ name, open, onClick, onDelete }) {
  return (
    <div className={`${s.file}${open ? ` ${s.open}` : ''}`}>
      <span className={s.filename} onClick={onClick}>{name}</span>
      <button className={s.deleteBtn} onClick={e => { e.stopPropagation(); onDelete(); }}>×</button>
    </div>
  );
}

export function Sidebar({ open = true, isMobile, files, loading, openTabFileIds, onClose, onRefresh, onOpenFile, onNewTab, onDeleteFile }) {
  const cls = [s.sidebar, isMobile && s.mobile, isMobile && open && s.open].filter(Boolean).join(' ');
  return (
    <div className={cls}>
      <div className={s.header}>
        <span className={s.filesLabel}>Files</span>
        <IconBtn title="Refresh" onClick={onRefresh} disabled={loading}>↻</IconBtn>
        <IconBtn title="Close" onClick={onClose}>×</IconBtn>
      </div>

      <div className={s.list}>
        {loading
          ? <div className={s.empty}>Loading…</div>
          : files.length === 0
            ? <div className={s.empty}>No files yet.</div>
            : files.map(f => (
                <SidebarFile
                  key={f.id}
                  name={f.name}
                  open={openTabFileIds.has(f.id)}
                  onClick={() => onOpenFile(f.id, f.name)}
                  onDelete={() => onDeleteFile(f.id, f.name)}
                />
              ))
        }
      </div>

      <button onClick={onNewTab} className={s.newBtn}>+ New file</button>
    </div>
  );
}
