import { useState } from 'react';

export function IconBtn({ children, onClick, active, title, disabled }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      title={title}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: 'none', border: 'none',
        cursor: disabled ? 'default' : 'pointer',
        color: active ? '#9b85c4' : (hov ? '#7a7288' : '#b0a8c0'),
        fontSize: 15, padding: '2px 5px', lineHeight: 1, transition: 'color 0.1s',
      }}
    >{children}</button>
  );
}

export function Btn({ children, onClick, disabled, accent, style: extra = {} }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: accent ? (hov ? '#8470b8' : '#9b85c4') : 'transparent',
        border: `1px solid ${accent ? '#9b85c4' : (hov ? '#b0a8c0' : '#dedad5')}`,
        color: accent ? '#fff' : (hov ? '#4a4260' : '#8a8598'),
        padding: '5px 13px', fontSize: 12,
        cursor: disabled ? 'not-allowed' : 'pointer',
        borderRadius: 3, fontFamily: "'DM Sans', sans-serif",
        fontWeight: accent ? 500 : 400, opacity: disabled ? 0.4 : 1,
        transition: 'all 0.15s', ...extra,
      }}
    >{children}</button>
  );
}

export function Overlay({ children, onClose }) {
  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'absolute', inset: 0,
        background: 'rgba(130,120,150,0.35)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
      }}
    >{children}</div>
  );
}

export function Modal({ title, children, wide }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid #dbd5e8', borderRadius: 8,
      padding: '26px 28px', width: wide ? 580 : 440, maxWidth: '92vw',
    }}>
      <div style={{ fontSize: 13, fontWeight: 500, color: '#9b85c4', marginBottom: 22, letterSpacing: '0.02em' }}>
        {title}
      </div>
      {children}
    </div>
  );
}

export function Field({ label, hint, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ display: 'block', fontSize: 10, color: '#8a8098', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
        {label}
      </label>
      {children}
      {hint && <div style={{ fontSize: 10, color: '#bbb5c8', marginTop: 4 }}>{hint}</div>}
    </div>
  );
}

export function Inp({ type = 'text', value, onChange, placeholder }) {
  return (
    <input
      type={type} value={value} onChange={onChange} placeholder={placeholder}
      style={{
        width: '100%', background: '#f7f6f4', border: '1px solid #d8d2e5',
        color: '#2a2825', padding: '7px 10px', fontSize: 12,
        fontFamily: "'DM Mono', monospace", borderRadius: 4, outline: 'none',
      }}
    />
  );
}

export function Row({ children, style: extra = {} }) {
  return <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', ...extra }}>{children}</div>;
}
