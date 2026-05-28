export function EditorPane({ tab, focused, taRef, hasSplit, isMobile, onFocus, onChange }) {
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
        placeholder="Start writing…"
        spellCheck
        style={{
          flex: 1, background: 'transparent', border: 'none', outline: 'none',
          resize: 'none', overflowY: 'auto',
          padding: isMobile ? '20px 20px' : (hasSplit ? '28px 28px' : '36px 40px'),
          maxWidth: hasSplit ? '100%' : 720,
          width: '100%', margin: hasSplit ? 0 : '0 auto',
          fontSize: 17, lineHeight: 1.8, color: '#2a2825',
          fontFamily: "'Lora', Georgia, serif",
        }}
      />
    </div>
  );
}
