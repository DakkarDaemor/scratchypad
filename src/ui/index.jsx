import s from './ui.module.css';

export function IconBtn({ children, onClick, active, title, disabled }) {
  return (
    <button
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`${s.iconBtn}${active ? ` ${s.active}` : ''}`}
    >{children}</button>
  );
}

export function Btn({ children, onClick, disabled, accent, style: extra = {} }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${s.btn}${accent ? ` ${s.accent}` : ''}`}
      style={extra}
    >{children}</button>
  );
}

export function Overlay({ children, onClose, zIndex = 200 }) {
  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      className={s.overlay}
      style={{ zIndex }}
    >{children}</div>
  );
}

export function Modal({ title, children, wide }) {
  return (
    <div className={`${s.modal}${wide ? ` ${s.wide}` : ''}`}>
      <div className={s.modalTitle}>{title}</div>
      {children}
    </div>
  );
}

export function Field({ label, hint, children }) {
  return (
    <div className={s.field}>
      <label className={s.fieldLabel}>{label}</label>
      {children}
      {hint && <div className={s.fieldHint}>{hint}</div>}
    </div>
  );
}

export function Inp({ type = 'text', value, onChange, placeholder }) {
  return (
    <input
      type={type} value={value} onChange={onChange} placeholder={placeholder}
      className={s.inp}
    />
  );
}

export function Row({ children, style: extra = {} }) {
  return <div className={s.row} style={extra}>{children}</div>;
}
