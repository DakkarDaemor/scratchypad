import { useEffect, useRef, useState } from 'react';
import { marked } from 'marked';
import s from './EditorPane.module.css';

marked.use({ breaks: true, gfm: true });

export function EditorPane({ tab, focused, taRef, hasSplit, isMobile, onFocus, onChange, fontSize, onFontResize, markdownEnabled }) {
  const pinchRef = useRef(null);
  const [mdPreview, setMdPreview] = useState(false);

  useEffect(() => { if (!markdownEnabled) setMdPreview(false); }, [markdownEnabled]);

  useEffect(() => {
    const el = taRef.current;
    if (!el) return;
    const onWheel = e => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      onFontResize(e.deltaY < 0 ? 1 : -1);
    };
    const onTouchMove = e => { if (e.touches.length === 2) e.preventDefault(); };
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

  if (!tab) return <div className={s.pane} />;

  const padding  = isMobile ? '20px 20px' : (hasSplit ? '28px 28px' : '36px 40px');
  const maxWidth = hasSplit ? '100%' : 720;
  const sharedStyle = { padding, maxWidth, margin: hasSplit ? 0 : '0 auto', fontSize };

  return (
    <div
      onClick={onFocus}
      className={s.pane}
      style={{
        position: 'relative',
        ...(focused && hasSplit ? { outline: '1px solid #e0d8f0', outlineOffset: -1 } : {}),
      }}
    >
      {markdownEnabled && (
        <button
          className={s.toggleBtn}
          onClick={e => { e.stopPropagation(); setMdPreview(p => !p); }}
        >
          {mdPreview ? '✎ Edit' : '⊞ Preview'}
        </button>
      )}

      {markdownEnabled && mdPreview
        ? <div
            className={s.preview}
            style={sharedStyle}
            dangerouslySetInnerHTML={{ __html: marked.parse(tab.text || '') }}
            onClick={() => setMdPreview(false)}
          />
        : <textarea
            ref={taRef}
            value={tab.text}
            onChange={e => onChange(e.target.value)}
            onFocus={onFocus}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={() => { pinchRef.current = null; }}
            placeholder="Start writing…"
            spellCheck
            className={s.textarea}
            style={sharedStyle}
          />
      }
    </div>
  );
}
