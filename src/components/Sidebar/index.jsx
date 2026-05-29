import { IconBtn } from '../../ui';
import s from './Sidebar.module.css';

const stripLabel = name => {
  let n = name;
  if (n.endsWith('.bak')) n = n.slice(0, -4);
  if (n.endsWith('.txt')) n = n.slice(0, -4);
  return n;
};

function SidebarFile({ label, open, isBak, snippet, onClick, onDelete }) {
  const cls = [s.file, open && s.open, isBak && s.bak].filter(Boolean).join(' ');
  return (
    <div className={cls}>
      <span className={s.filename} onClick={onClick}>{isBak ? `↩ ${label}` : label}</span>
      {snippet && <span className={s.snippet}>{snippet}</span>}
      <button className={s.deleteBtn} onClick={e => { e.stopPropagation(); onDelete(); }}>×</button>
    </div>
  );
}

export function Sidebar({ open = true, isMobile, files, snippets = {}, loading, openTabFileIds, onClose, onRefresh, onOpenFile, onNewTab, onDeleteFile }) {
  const cls = [s.sidebar, isMobile && s.mobile, isMobile && open && s.open].filter(Boolean).join(' ');

  const regularFiles = files.filter(f => !f.name.endsWith('.bak'));
  const bakFiles     = files.filter(f =>  f.name.endsWith('.bak'));

  return (
    <div className={cls}>
      <div className={s.header}>
        <span className={s.filesLabel}>Files</span>
        <IconBtn title="Refresh" onClick={onRefresh} disabled={loading}>↻</IconBtn>
        {isMobile && <IconBtn title="Close" onClick={onClose}>×</IconBtn>}
      </div>

      <div className={s.list}>
        {loading
          ? <div className={s.empty}>Loading…</div>
          : regularFiles.length === 0 && bakFiles.length === 0
            ? <div className={s.empty}>No files yet.</div>
            : <>
                {regularFiles.map(f => (
                  <SidebarFile
                    key={f.id}
                    label={stripLabel(f.name)}
                    open={openTabFileIds.has(f.id)}
                    snippet={snippets[f.id] || ''}
                    onClick={() => onOpenFile(f.id, f.name)}
                    onDelete={() => onDeleteFile(f.id, f.name)}
                  />
                ))}
                {bakFiles.length > 0 && (
                  <div className={s.bakSection}>
                    <span className={s.bakLabel}>Backups</span>
                    {bakFiles.map(f => (
                      <SidebarFile
                        key={f.id}
                        label={stripLabel(f.name)}
                        isBak
                        open={false}
                        onClick={() => onOpenFile(f.id, f.name)}
                        onDelete={() => onDeleteFile(f.id, f.name)}
                      />
                    ))}
                  </div>
                )}
              </>
        }
      </div>

      <button onClick={onNewTab} className={s.newBtn}>+ New file</button>
    </div>
  );
}
