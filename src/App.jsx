import { useState, useEffect, useRef } from "react";

const KEYS = {
  DROPBOX: 'sp_dropbox',
  CLAUDE:  'sp_claude',
  DRAFT:   'sp_draft',
  FNAME:   'sp_filename',
};

const FONTS = `
  @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;1,400&family=DM+Mono:wght@300;400&family=DM+Sans:wght@300;400;500&display=swap');
  * { box-sizing: border-box; }
  ::selection { background: #c49a5c33; }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #2a2a2a; border-radius: 2px; }
  textarea::placeholder { color: #333; }
  input::placeholder { color: #333; }
`;

const AI_ACTIONS = ['Summarize', 'Improve', 'Fix grammar', 'Shorten', 'IT ↔ EN'];

const AI_PROMPTS = {
  'Summarize':   c => `Summarize this text concisely. Reply only with the summary.\n\n${c}`,
  'Improve':     c => `Improve clarity and style. Keep the same language. Reply only with the improved text.\n\n${c}`,
  'Fix grammar': c => `Fix grammar and typos. Keep style and language. Reply only with the corrected text.\n\n${c}`,
  'Shorten':     c => `Make this shorter while keeping key points. Same language. Reply only with the result.\n\n${c}`,
  'IT ↔ EN':     c => `If this text is in Italian translate to English; if in English translate to Italian. Reply only with the translation.\n\n${c}`,
};

export default function ScratchyPad() {
  const [text,        setText]        = useState('');
  const [filename,    setFilename]    = useState('scratch.txt');
  const [dropboxTok,  setDropboxTok]  = useState('');
  const [claudeKey,   setClaudeKey]   = useState('');
  const [panel,       setPanel]       = useState(null);
  const [status,      setStatus]      = useState({ msg: '', type: 'info' });
  const [loading,     setLoading]     = useState(false);
  const [files,       setFiles]       = useState([]);
  const [aiResult,    setAiResult]    = useState('');
  const [aiLabel,     setAiLabel]     = useState('');
  const [tmpDbox,     setTmpDbox]     = useState('');
  const [tmpClaude,   setTmpClaude]   = useState('');
  const taRef = useRef(null);

  /* ── Boot ── */
  useEffect(() => {
    const el = document.createElement('style');
    el.textContent = FONTS;
    document.head.appendChild(el);
    return () => document.head.removeChild(el);
  }, []);

  useEffect(() => {
    const d  = localStorage.getItem(KEYS.DROPBOX) || '';
    const c  = localStorage.getItem(KEYS.CLAUDE)  || '';
    const t  = localStorage.getItem(KEYS.DRAFT)   || '';
    const fn = localStorage.getItem(KEYS.FNAME)   || 'scratch.txt';
    setDropboxTok(d); setTmpDbox(d);
    setClaudeKey(c);  setTmpClaude(c);
    setText(t);
    setFilename(fn);
  }, []);

  useEffect(() => { localStorage.setItem(KEYS.DRAFT, text); }, [text]);

  /* ── Helpers ── */
  const flash = (msg, type = 'info') => {
    setStatus({ msg, type });
    setTimeout(() => setStatus({ msg: '', type: 'info' }), 3000);
  };

  const getSelected = () => {
    const ta = taRef.current;
    if (!ta) return text;
    const sel = ta.value.substring(ta.selectionStart, ta.selectionEnd);
    return sel.trim() ? sel : text;
  };

  /* ── Dropbox ── */
  const dbHeaders = (extra = {}) => ({
    Authorization: `Bearer ${dropboxTok}`,
    ...extra,
  });

  const saveToDropbox = async () => {
    if (!dropboxTok) { flash('Set Dropbox token in settings', 'warn'); return; }
    setLoading(true);
    flash('Saving…');
    try {
      const path = `/scratchypad/${filename}`;
      const r = await fetch('https://content.dropboxapi.com/2/files/upload', {
        method: 'POST',
        headers: {
          ...dbHeaders({ 'Content-Type': 'application/octet-stream' }),
          'Dropbox-API-Arg': JSON.stringify({ path, mode: 'overwrite' }),
        },
        body: new TextEncoder().encode(text),
      });
      if (!r.ok) { const e = await r.json(); throw new Error(e.error_summary || r.status); }
      flash('Saved to Dropbox ✓', 'ok');
    } catch (e) { flash(`Save failed: ${e.message}`, 'err'); }
    setLoading(false);
  };

  const openDropbox = async () => {
    if (!dropboxTok) { flash('Set Dropbox token in settings', 'warn'); return; }
    setLoading(true);
    try {
      const r = await fetch('https://api.dropboxapi.com/2/files/list_folder', {
        method: 'POST',
        headers: dbHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ path: '/scratchypad' }),
      });
      if (r.status === 409) { setFiles([]); setPanel('files'); setLoading(false); return; }
      if (!r.ok) { const e = await r.json(); throw new Error(e.error_summary || r.status); }
      const data = await r.json();
      setFiles((data.entries || []).filter(e => e['.tag'] === 'file'));
      setPanel('files');
    } catch (e) { flash(`Open failed: ${e.message}`, 'err'); }
    setLoading(false);
  };

  const loadFile = async (path) => {
    setLoading(true);
    try {
      const r = await fetch('https://content.dropboxapi.com/2/files/download', {
        method: 'POST',
        headers: {
          ...dbHeaders(),
          'Dropbox-API-Arg': JSON.stringify({ path }),
        },
      });
      if (!r.ok) throw new Error('Download failed');
      setText(await r.text());
      const fn = path.split('/').pop();
      setFilename(fn);
      localStorage.setItem(KEYS.FNAME, fn);
      setPanel(null);
      flash('Loaded ✓', 'ok');
    } catch (e) { flash(`Load failed: ${e.message}`, 'err'); }
    setLoading(false);
  };

  /* ── Claude AI ── */
  const runAI = async (action) => {
    const content = getSelected();
    if (!content.trim()) { flash('Nothing to process', 'warn'); return; }
    setLoading(true);
    setAiLabel(action);
    flash(`Running "${action}"…`);
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (claudeKey) headers['x-api-key'] = claudeKey;
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{ role: 'user', content: AI_PROMPTS[action](content) }],
        }),
      });
      if (!r.ok) throw new Error(await r.text());
      const data = await r.json();
      setAiResult(data.content?.[0]?.text || '');
      setPanel('result');
      setStatus({ msg: '', type: 'info' });
    } catch (e) { flash(`AI error: ${e.message}`, 'err'); }
    setLoading(false);
  };

  const applyResult = () => {
    const ta = taRef.current;
    if (!ta) return;
    const { selectionStart: s, selectionEnd: e } = ta;
    setText(s !== e ? text.substring(0, s) + aiResult + text.substring(e) : aiResult);
    setPanel(null);
    setAiResult('');
  };

  /* ── Settings ── */
  const saveSettings = () => {
    localStorage.setItem(KEYS.DROPBOX, tmpDbox);
    localStorage.setItem(KEYS.CLAUDE,  tmpClaude);
    setDropboxTok(tmpDbox);
    setClaudeKey(tmpClaude);
    setPanel(null);
    flash('Settings saved ✓', 'ok');
  };

  /* ── Stats ── */
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const statusColor = { ok: '#7a9f6a', err: '#c46a6a', warn: '#c49a5c', info: '#c49a5c' };

  return (
    <div style={{
      fontFamily: "'DM Sans', sans-serif",
      background: '#0d0d0d',
      color: '#e5ddd0',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      position: 'relative',
    }}>

      {/* ── Top bar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '9px 16px',
        borderBottom: '1px solid #1e1e1e',
        background: '#111',
        flexShrink: 0,
      }}>
        <span style={{
          fontSize: 13, fontWeight: 500, color: '#c49a5c',
          letterSpacing: '0.01em', marginRight: 4, userSelect: 'none',
        }}>
          ScratchyPad
        </span>

        <div style={{ width: 1, height: 14, background: '#2a2a2a' }} />

        <input
          value={filename}
          onChange={e => { setFilename(e.target.value); localStorage.setItem(KEYS.FNAME, e.target.value); }}
          spellCheck={false}
          style={{
            background: 'transparent', border: 'none', outline: 'none',
            color: '#7a7060', fontFamily: "'DM Mono', monospace",
            fontSize: 12, width: 180,
          }}
        />

        <div style={{ flex: 1 }} />

        {status.msg && (
          <span style={{ fontSize: 11, color: statusColor[status.type] || '#c49a5c' }}>
            {status.msg}
          </span>
        )}

        <Btn onClick={openDropbox}   disabled={loading}>Open</Btn>
        <Btn onClick={saveToDropbox} disabled={loading} accent>
          {loading ? '…' : 'Save'}
        </Btn>
        <Btn onClick={() => { setTmpDbox(dropboxTok); setTmpClaude(claudeKey); setPanel('settings'); }}>
          ⚙
        </Btn>
      </div>

      {/* ── Editor ── */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', justifyContent: 'center' }}>
        <textarea
          ref={taRef}
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Start writing…"
          spellCheck
          style={{
            flex: 1, maxWidth: 720, width: '100%',
            background: 'transparent', border: 'none', outline: 'none',
            resize: 'none', overflowY: 'auto',
            padding: '36px 40px',
            fontSize: 17, lineHeight: 1.8,
            color: '#e5ddd0',
            fontFamily: "'Lora', Georgia, serif",
          }}
        />
      </div>

      {/* ── AI bar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '7px 16px',
        borderTop: '1px solid #1a1a1a',
        background: '#0f0f0f',
        flexShrink: 0, flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: 9, color: '#3a3530', textTransform: 'uppercase', letterSpacing: '0.1em', marginRight: 4 }}>
          AI
        </span>
        {AI_ACTIONS.map(a => (
          <button key={a} disabled={loading} onClick={() => runAI(a)}
            style={{
              background: 'transparent',
              border: '1px solid #222', color: '#6a6055',
              padding: '3px 10px', fontSize: 11, cursor: 'pointer',
              borderRadius: 3, fontFamily: "'DM Sans', sans-serif",
              transition: 'border-color 0.15s, color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#c49a5c'; e.currentTarget.style.color = '#c49a5c'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#222';    e.currentTarget.style.color = '#6a6055'; }}
          >
            {a}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 10, color: '#2e2a25' }}>
          {words} w · {text.length} ch
        </span>
      </div>

      {/* ── Settings modal ── */}
      {panel === 'settings' && (
        <Overlay onClose={() => setPanel(null)}>
          <Modal title="Settings">
            <Field label="Dropbox Access Token"
              hint="dropbox.com/developers/apps → your app → Generate access token">
              <Inp type="password" value={tmpDbox} onChange={e => setTmpDbox(e.target.value)} placeholder="sl.xxxx…" />
            </Field>
            <Field label="Claude API Key"
              hint="console.anthropic.com — needed to use AI features">
              <Inp type="password" value={tmpClaude} onChange={e => setTmpClaude(e.target.value)} placeholder="sk-ant-…" />
            </Field>
            <Row>
              <Btn onClick={() => setPanel(null)}>Cancel</Btn>
              <Btn accent onClick={saveSettings}>Save</Btn>
            </Row>
          </Modal>
        </Overlay>
      )}

      {/* ── File list modal ── */}
      {panel === 'files' && (
        <Overlay onClose={() => setPanel(null)}>
          <Modal title="Open from Dropbox">
            {files.length === 0
              ? <p style={{ fontSize: 13, color: '#554f46' }}>No files in /scratchypad yet.</p>
              : files.map(f => (
                  <FileRow key={f.path_lower} name={f.name} onClick={() => loadFile(f.path_lower)} />
                ))
            }
            <Row style={{ marginTop: 16 }}>
              <Btn onClick={() => setPanel(null)}>Close</Btn>
            </Row>
          </Modal>
        </Overlay>
      )}

      {/* ── AI result modal ── */}
      {panel === 'result' && (
        <Overlay onClose={() => setPanel(null)}>
          <Modal title={aiLabel} wide>
            <div style={{
              background: '#0d0d0d', border: '1px solid #222',
              borderRadius: 4, padding: '16px 18px',
              fontSize: 14, lineHeight: 1.75,
              color: '#d5cdc0', fontFamily: "'Lora', Georgia, serif",
              whiteSpace: 'pre-wrap', overflowY: 'auto',
              maxHeight: '52vh', marginBottom: 16,
            }}>
              {aiResult}
            </div>
            <Row>
              <Btn onClick={() => setPanel(null)}>Discard</Btn>
              <Btn accent onClick={applyResult}>Apply (replace)</Btn>
            </Row>
          </Modal>
        </Overlay>
      )}
    </div>
  );
}

/* ── Small components ── */

function Btn({ children, onClick, disabled, accent, style = {} }) {
  const [hov, setHov] = useState(false);
  const base = {
    background: accent ? (hov ? '#d4aa6c' : '#c49a5c') : 'transparent',
    border: `1px solid ${accent ? '#c49a5c' : (hov ? '#444' : '#272727')}`,
    color: accent ? '#0d0d0d' : (hov ? '#c8bfb0' : '#7a7060'),
    padding: '5px 13px', fontSize: 12, cursor: disabled ? 'not-allowed' : 'pointer',
    borderRadius: 3, fontFamily: "'DM Sans', sans-serif",
    fontWeight: accent ? '500' : '400',
    opacity: disabled ? 0.4 : 1,
    transition: 'all 0.15s',
    ...style,
  };
  return (
    <button style={base} onClick={onClick} disabled={disabled}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
      {children}
    </button>
  );
}

function Overlay({ children, onClose }) {
  return (
    <div onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'absolute', inset: 0,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 200,
      }}>
      {children}
    </div>
  );
}

function Modal({ title, children, wide }) {
  return (
    <div style={{
      background: '#141414', border: '1px solid #252525',
      borderRadius: 8, padding: '26px 28px',
      width: wide ? 580 : 440, maxWidth: '92vw',
    }}>
      <div style={{ fontSize: 13, fontWeight: 500, color: '#c49a5c', marginBottom: 22, letterSpacing: '0.02em' }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ display: 'block', fontSize: 10, color: '#6a6055', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
        {label}
      </label>
      {children}
      {hint && <div style={{ fontSize: 10, color: '#383330', marginTop: 4 }}>{hint}</div>}
    </div>
  );
}

function Inp({ type = 'text', value, onChange, placeholder }) {
  return (
    <input type={type} value={value} onChange={onChange} placeholder={placeholder}
      style={{
        width: '100%', background: '#0d0d0d',
        border: '1px solid #252525', color: '#e5ddd0',
        padding: '7px 10px', fontSize: 12,
        fontFamily: "'DM Mono', monospace",
        borderRadius: 4, outline: 'none',
      }}
    />
  );
}

function Row({ children, style = {} }) {
  return <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', ...style }}>{children}</div>;
}

function FileRow({ name, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <div onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        padding: '9px 12px', cursor: 'pointer', borderRadius: 4,
        fontSize: 12, fontFamily: "'DM Mono', monospace", color: '#9a8f7e',
        background: hov ? '#1a1a1a' : 'transparent',
        border: `1px solid ${hov ? '#2a2a2a' : 'transparent'}`,
        marginBottom: 3, transition: 'all 0.1s',
      }}>
      {name}
    </div>
  );
}
