import { useEffect, useRef, useState, useMemo } from 'react';
import { marked } from 'marked';
import s from './EditorPane.module.css';

marked.use({ breaks: true, gfm: true });

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function FindBar({ text, taRef, mode, onTextChange, onClose }) {
  const [query,       setQuery]       = useState('');
  const [replacement, setReplacement] = useState('');
  const [matchIdx,    setMatchIdx]    = useState(0);
  const findRef = useRef(null);

  useEffect(() => { findRef.current?.focus(); }, []);

  const matches = useMemo(() => {
    if (!query) return [];
    const lc = text.toLowerCase();
    const lq = query.toLowerCase();
    const out = [];
    let i = 0;
    while ((i = lc.indexOf(lq, i)) !== -1) { out.push(i); i += query.length || 1; }
    return out;
  }, [query, text]);

  useEffect(() => { setMatchIdx(0); }, [query, text]);

  useEffect(() => {
    const ta = taRef.current;
    if (!ta || !matches.length || !query) return;
    const idx = ((matchIdx % matches.length) + matches.length) % matches.length;
    ta.focus();
    ta.setSelectionRange(matches[idx], matches[idx] + query.length);
  }, [matchIdx, matches, query, taRef]);

  const safeIdx = () => ((matchIdx % matches.length) + matches.length) % matches.length;
  const goNext  = () => setMatchIdx(i => i + 1);
  const goPrev  = () => setMatchIdx(i => i - 1);

  const replaceOne = () => {
    if (!matches.length || !query) return;
    const start = matches[safeIdx()];
    onTextChange(text.substring(0, start) + replacement + text.substring(start + query.length));
  };

  const replaceAll = () => {
    if (!query) return;
    onTextChange(text.replace(new RegExp(escapeRegex(query), 'gi'), replacement));
  };

  const onFindKey = e => {
    if (e.key === 'Escape') { onClose(); return; }
    if (e.key === 'Enter') { e.preventDefault(); e.shiftKey ? goPrev() : goNext(); }
  };

  const onReplaceKey = e => {
    if (e.key === 'Escape') { onClose(); return; }
    if (e.key === 'Enter') { e.preventDefault(); replaceOne(); }
  };

  const count = matches.length;
  const shown = query ? (count ? `${safeIdx() + 1}/${count}` : '0') : '';

  return (
    <div className={s.findBar}>
      <div className={s.findRow}>
        <input
          ref={findRef}
          className={s.findInput}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={onFindKey}
          placeholder="Find…"
        />
        <span className={s.findCount}>{shown}</span>
        <button className={s.findBtn} onClick={goPrev} disabled={count < 2} title="Previous (Shift+Enter)">↑</button>
        <button className={s.findBtn} onClick={goNext} disabled={count < 2} title="Next (Enter)">↓</button>
        {mode === 'replace' && <>
          <button className={s.findBtnWide} onClick={replaceOne} disabled={!count}>Replace</button>
          <button className={s.findBtnWide} onClick={replaceAll} disabled={!count}>All</button>
        </>}
        <button className={s.findClose} onClick={onClose}>×</button>
      </div>
      {mode === 'replace' && (
        <div className={s.findRow}>
          <input
            className={s.findInput}
            value={replacement}
            onChange={e => setReplacement(e.target.value)}
            onKeyDown={onReplaceKey}
            placeholder="Replace with…"
          />
        </div>
      )}
    </div>
  );
}

export function EditorPane({ tab, focused, taRef, hasSplit, isMobile, onFocus, onChange, fontSize, onFontResize, markdownEnabled, findTrigger, onFindTriggered }) {
  const pinchRef = useRef(null);
  const [mdPreview, setMdPreview] = useState(false);
  const [findOpen,  setFindOpen]  = useState(false);
  const [findMode,  setFindMode]  = useState('find');

  useEffect(() => { if (!markdownEnabled) setMdPreview(false); }, [markdownEnabled]);

  useEffect(() => { setFindOpen(false); }, [tab?.id]);

  useEffect(() => {
    if (!findTrigger || !focused) return;
    setFindMode(findTrigger);
    setFindOpen(true);
    onFindTriggered?.();
  }, [findTrigger, focused]); // eslint-disable-line

  useEffect(() => {
    if (!focused) return;
    const handler = e => {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key === 'f') { e.preventDefault(); setFindMode('find');    setFindOpen(true); }
      if (e.key === 'h') { e.preventDefault(); setFindMode('replace'); setFindOpen(true); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [focused]);

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
      {findOpen && (
        <FindBar
          text={tab.text}
          taRef={taRef}
          mode={findMode}
          onTextChange={text => onChange(text)}
          onClose={() => { setFindOpen(false); taRef.current?.focus(); }}
        />
      )}

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
