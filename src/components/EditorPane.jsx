import { useEffect, useRef } from 'react';

export function EditorPane({ tab, focused, taRef, hasSplit, isMobile, onFocus, onChange, fontSize, onFontResize }) {
  const pinchRef = useRef(null);

  useEffect(() => {
    const el = taRef.current;
    if (!el) return;

    const onWheel = e => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      onFontResize(e.deltaY < 0 ? 1 : -1);
    };

    const onTouchMove = e => {
      if (e.touches.length === 2) e.preventDefault();
    };

    el.addEventListener('wheel',     onWheel,     { passive: false });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => {
      el.removeEventListener('wheel',     onWheel);
      el.removeEventListener('touchmove', onTouchMove);
    };
  }, [onFontResize, taRef]);

  const onTouchStart = e => {
    if (e.touches.length !== 2) return;
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    pinchRef.current = Math.hypot(dx, dy);
  };

  const onTouchMove = e => {
    if (e.touches.length !== 2 || !pinchRef.current) return;
    const dx   = e.touches[0].clientX - e.touches[1].clientX;
    const dy   = e.touches[0].clientY - e.touches[1].clientY;
    const dist = Math.hypot(dx, dy);
    if (Math.abs(dist - pinchRef.current) > 8) {
      onFontResize(dist > pinchRef.current ? 1 : -1);
      pinchRef.current = dist;
    }
  };

  if (!tab) return <div style={{ flex: 1 }} />;

  return (
    <div
      onClick={onFocus}
      style={{
        flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden',
        outline: focused && hasSplit ? '1px solid #e0d8f0' : 'none', outlineOffset: -1,
      }}
    >
      <textarea
        ref={taRef}
        value={tab.text}
        onChange={e => onChange(e.target.value)}
        onFocus={onFocus}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={() => { pinchRef.current = null; }}
        placeholder="Start writing…"
        spellCheck
        style={{
          flex: 1, background: 'transparent', border: 'none', outline: 'none',
          resize: 'none', overflowY: 'auto',
          padding: isMobile ? '20px 20px' : (hasSplit ? '28px 28px' : '36px 40px'),
          maxWidth: hasSplit ? '100%' : 720,
          width: '100%', margin: hasSplit ? 0 : '0 auto',
          fontSize, lineHeight: 1.8, color: '#2a2825',
          fontFamily: "'Lora', Georgia, serif",
        }}
      />
    </div>
  );
}
