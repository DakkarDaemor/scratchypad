import { useState, useEffect, useRef } from "react";

// Replace with your Google Cloud OAuth 2.0 Web Client ID
const GDRIVE_CLIENT_ID = '29731384499-qnl2dp9jvihpvlqumprmuccpelp7mf9a.apps.googleusercontent.com';

const KEYS = {
  GDRIVE_TOKEN:  'sp_gdrive_token',
  GDRIVE_EXPIRY: 'sp_gdrive_expiry',
  GDRIVE_FOLDER: 'sp_gdrive_folder',
  GDRIVE_CONFIG: 'sp_gdrive_config_id',
  DRAFT: 'sp_draft',
  FNAME: 'sp_filename',
};

const FONTS = `
  @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;1,400&family=DM+Mono:wght@300;400&family=DM+Sans:wght@300;400;500&display=swap');
  * { box-sizing: border-box; }
  ::selection { background: #9b85c433; }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #c8c0d8; border-radius: 2px; }
  textarea::placeholder { color: #aaa8b8; }
  input::placeholder { color: #aaa8b8; }
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
  const [text,       setText]       = useState('');
  const [filename,   setFilename]   = useState('scratch.txt');
  const [claudeKey,  setClaudeKey]  = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [panel,      setPanel]      = useState(null);
  const [status,     setStatus]     = useState({ msg: '', type: 'info' });
  const [loading,    setLoading]    = useState(false);
  const [files,      setFiles]      = useState([]);
  const [aiResult,   setAiResult]   = useState('');
  const [aiLabel,    setAiLabel]    = useState('');
  const [tmpClaude,  setTmpClaude]  = useState('');
  const taRef = useRef(null);

  /* ── Boot ── */
  useEffect(() => {
    const el = document.createElement('style');
    el.textContent = FONTS;
    document.head.appendChild(el);
    return () => document.head.removeChild(el);
  }, []);

  useEffect(() => {
    setText(localStorage.getItem(KEYS.DRAFT) || '');
    setFilename(localStorage.getItem(KEYS.FNAME) || 'scratch.txt');
    // Auto-restore session if token still valid
    const tok = localStorage.getItem(KEYS.GDRIVE_TOKEN);
    const exp = Number(localStorage.getItem(KEYS.GDRIVE_EXPIRY) || 0);
    if (tok && Date.now() < exp) {
      loadConfig(tok)
        .then(() => setIsLoggedIn(true))
        .catch(() => {});
    }
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

  /* ── Auth ── */
  const getToken = () => new Promise((resolve, reject) => {
    if (!window.google?.accounts?.oauth2) { reject(new Error('Google API not loaded')); return; }
    const tok = localStorage.getItem(KEYS.GDRIVE_TOKEN);
    const exp = Number(localStorage.getItem(KEYS.GDRIVE_EXPIRY) || 0);
    if (tok && Date.now() < exp) { resolve(tok); return; }
    const tc = window.google.accounts.oauth2.initTokenClient({
      client_id: GDRIVE_CLIENT_ID,
      scope: 'https://www.googleapis.com/auth/drive.file',
      callback: (resp) => {
        if (resp.error) { reject(new Error(resp.error_description || resp.error)); return; }
        const newTok = resp.access_token;
        localStorage.setItem(KEYS.GDRIVE_TOKEN, newTok);
        localStorage.setItem(KEYS.GDRIVE_EXPIRY, String(Date.now() + (resp.expires_in - 60) * 1000));
        resolve(newTok);
      },
      error_callback: (e) => reject(new Error(e.type || 'Auth failed')),
    });
    tc.requestAccessToken();
  });

  const login = async () => {
    setLoading(true);
    try {
      const tok = await getToken();
      await loadConfig(tok);
      setIsLoggedIn(true);
    } catch (e) { flash(`Login failed: ${e.message}`, 'err'); }
    setLoading(false);
  };

  const logout = () => {
    const tok = localStorage.getItem(KEYS.GDRIVE_TOKEN);
    if (tok && window.google?.accounts?.oauth2) {
      window.google.accounts.oauth2.revoke(tok);
    }
    [KEYS.GDRIVE_TOKEN, KEYS.GDRIVE_EXPIRY, KEYS.GDRIVE_FOLDER, KEYS.GDRIVE_CONFIG]
      .forEach(k => localStorage.removeItem(k));
    setIsLoggedIn(false);
    setClaudeKey('');
    setTmpClaude('');
    setPanel(null);
  };

  /* ── Config (Claude key stored in Drive) ── */
  const loadConfig = async (tok) => {
    const cachedId = localStorage.getItem(KEYS.GDRIVE_CONFIG);
    if (cachedId) {
      const r = await fetch(`https://www.googleapis.com/drive/v3/files/${cachedId}?alt=media`, {
        headers: { Authorization: `Bearer ${tok}` },
      });
      if (r.ok) {
        const cfg = await r.json().catch(() => ({}));
        setClaudeKey(cfg.claudeKey || '');
        setTmpClaude(cfg.claudeKey || '');
        return;
      }
      localStorage.removeItem(KEYS.GDRIVE_CONFIG);
    }
    // Search for existing config file
    const q = encodeURIComponent("name='scratchypad_config.json' and trashed=false");
    const sr = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)`, {
      headers: { Authorization: `Bearer ${tok}` },
    });
    if (!sr.ok) return;
    const found = await sr.json();
    if (found.files?.length) {
      const id = found.files[0].id;
      localStorage.setItem(KEYS.GDRIVE_CONFIG, id);
      const r = await fetch(`https://www.googleapis.com/drive/v3/files/${id}?alt=media`, {
        headers: { Authorization: `Bearer ${tok}` },
      });
      if (r.ok) {
        const cfg = await r.json().catch(() => ({}));
        setClaudeKey(cfg.claudeKey || '');
        setTmpClaude(cfg.claudeKey || '');
      }
    } else {
      await writeConfigFile(tok, '');
    }
  };

  const writeConfigFile = async (tok, key) => {
    const body = JSON.stringify({ claudeKey: key });
    const cachedId = localStorage.getItem(KEYS.GDRIVE_CONFIG);
    if (cachedId) {
      await fetch(`https://www.googleapis.com/upload/drive/v3/files/${cachedId}?uploadType=media`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
        body,
      });
    } else {
      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify({ name: 'scratchypad_config.json' })], { type: 'application/json' }));
      form.append('file', new Blob([body], { type: 'application/json' }));
      const cr = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: { Authorization: `Bearer ${tok}` },
        body: form,
      });
      if (cr.ok) { const f = await cr.json(); localStorage.setItem(KEYS.GDRIVE_CONFIG, f.id); }
    }
  };

  /* ── Drive ── */
  const ensureFolder = async (tok) => {
    const cached = localStorage.getItem(KEYS.GDRIVE_FOLDER);
    if (cached) return cached;
    const q = encodeURIComponent("name='scratchypad' and mimeType='application/vnd.google-apps.folder' and trashed=false");
    const r = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)`, {
      headers: { Authorization: `Bearer ${tok}` },
    });
    if (!r.ok) throw new Error(`Drive error ${r.status}`);
    const data = await r.json();
    if (data.files?.length) {
      localStorage.setItem(KEYS.GDRIVE_FOLDER, data.files[0].id);
      return data.files[0].id;
    }
    const cr = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'scratchypad', mimeType: 'application/vnd.google-apps.folder' }),
    });
    if (!cr.ok) throw new Error(`Create folder failed ${cr.status}`);
    const folder = await cr.json();
    localStorage.setItem(KEYS.GDRIVE_FOLDER, folder.id);
    return folder.id;
  };

  const saveToGDrive = async () => {
    setLoading(true);
    flash('Saving…');
    try {
      const tok = await getToken();
      const folderId = await ensureFolder(tok);
      const q = encodeURIComponent(`name='${filename}' and '${folderId}' in parents and trashed=false`);
      const sr = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)`, {
        headers: { Authorization: `Bearer ${tok}` },
      });
      if (!sr.ok) throw new Error(`Search failed ${sr.status}`);
      const found = await sr.json();
      const content = new Blob([text], { type: 'text/plain' });
      if (found.files?.length) {
        const ur = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${found.files[0].id}?uploadType=media`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'text/plain' },
          body: content,
        });
        if (!ur.ok) throw new Error(`Update failed ${ur.status}`);
      } else {
        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify({ name: filename, parents: [folderId] })], { type: 'application/json' }));
        form.append('file', content);
        const cr = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
          method: 'POST',
          headers: { Authorization: `Bearer ${tok}` },
          body: form,
        });
        if (!cr.ok) throw new Error(`Upload failed ${cr.status}`);
      }
      flash('Saved to Google Drive ✓', 'ok');
    } catch (e) { flash(`Save failed: ${e.message}`, 'err'); }
    setLoading(false);
  };

  const openGDrive = async () => {
    setLoading(true);
    try {
      const tok = await getToken();
      const folderId = await ensureFolder(tok);
      const q = encodeURIComponent(`'${folderId}' in parents and trashed=false`);
      const r = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,modifiedTime)&orderBy=modifiedTime+desc`, {
        headers: { Authorization: `Bearer ${tok}` },
      });
      if (!r.ok) throw new Error(`List failed ${r.status}`);
      const data = await r.json();
      setFiles(data.files || []);
      setPanel('files');
    } catch (e) { flash(`Open failed: ${e.message}`, 'err'); }
    setLoading(false);
  };

  const loadGFile = async (fileId, name) => {
    setLoading(true);
    try {
      const tok = await getToken();
      const r = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: { Authorization: `Bearer ${tok}` },
      });
      if (!r.ok) throw new Error(`Download failed ${r.status}`);
      setText(await r.text());
      setFilename(name);
      localStorage.setItem(KEYS.FNAME, name);
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
      const headers = {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      };
      if (claudeKey) headers['x-api-key'] = claudeKey;
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
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
  const saveSettings = async () => {
    setLoading(true);
    try {
      const tok = await getToken();
      await writeConfigFile(tok, tmpClaude);
      setClaudeKey(tmpClaude);
      setPanel(null);
      flash('Settings saved ✓', 'ok');
    } catch (e) { flash(`Save failed: ${e.message}`, 'err'); }
    setLoading(false);
  };

  /* ── Stats ── */
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const statusColor = { ok: '#7a9f6a', err: '#c46a6a', warn: '#9b85c4', info: '#9b85c4' };

  /* ── Login screen ── */
  if (!isLoggedIn) {
    return (
      <div style={{
        fontFamily: "'DM Sans', sans-serif",
        background: '#f7f6f4',
        color: '#2a2825',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 20,
      }}>
        <style>{FONTS}</style>
        <div style={{ fontSize: 20, fontWeight: 500, color: '#9b85c4', letterSpacing: '0.02em' }}>
          ScratchyPad
        </div>
        <Btn accent onClick={login} disabled={loading} style={{ padding: '8px 24px', fontSize: 13 }}>
          {loading ? '…' : 'Login with Google'}
        </Btn>
        {status.msg && (
          <span style={{ fontSize: 11, color: statusColor[status.type] || '#9b85c4' }}>
            {status.msg}
          </span>
        )}
      </div>
    );
  }

  /* ── Main app ── */
  return (
    <div style={{
      fontFamily: "'DM Sans', sans-serif",
      background: '#f7f6f4',
      color: '#2a2825',
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
        borderBottom: '1px solid #e2dedd',
        background: '#f1f0ee',
        flexShrink: 0,
      }}>
        <span style={{
          fontSize: 13, fontWeight: 500, color: '#9b85c4',
          letterSpacing: '0.01em', marginRight: 4, userSelect: 'none',
        }}>
          ScratchyPad
        </span>

        <div style={{ width: 1, height: 14, background: '#d0ccc8' }} />

        <input
          value={filename}
          onChange={e => { setFilename(e.target.value); localStorage.setItem(KEYS.FNAME, e.target.value); }}
          spellCheck={false}
          style={{
            background: 'transparent', border: 'none', outline: 'none',
            color: '#7a7588', fontFamily: "'DM Mono', monospace",
            fontSize: 12, width: 180,
          }}
        />

        <div style={{ flex: 1 }} />

        {status.msg && (
          <span style={{ fontSize: 11, color: statusColor[status.type] || '#9b85c4' }}>
            {status.msg}
          </span>
        )}

        <Btn onClick={openGDrive}   disabled={loading}>Open</Btn>
        <Btn onClick={saveToGDrive} disabled={loading} accent>
          {loading ? '…' : 'Save'}
        </Btn>
        <Btn onClick={() => { setTmpClaude(claudeKey); setPanel('settings'); }}>⚙</Btn>
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
            color: '#2a2825',
            fontFamily: "'Lora', Georgia, serif",
          }}
        />
      </div>

      {/* ── AI bar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '7px 16px',
        borderTop: '1px solid #e5e0de',
        background: '#f3f2f0',
        flexShrink: 0, flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: 9, color: '#c0b8cc', textTransform: 'uppercase', letterSpacing: '0.1em', marginRight: 4 }}>
          AI
        </span>
        {AI_ACTIONS.map(a => (
          <button key={a} disabled={loading} onClick={() => runAI(a)}
            style={{
              background: 'transparent',
              border: '1px solid #ddd8e8', color: '#8a8098',
              padding: '3px 10px', fontSize: 11, cursor: 'pointer',
              borderRadius: 3, fontFamily: "'DM Sans', sans-serif",
              transition: 'border-color 0.15s, color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#9b85c4'; e.currentTarget.style.color = '#9b85c4'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#ddd8e8'; e.currentTarget.style.color = '#8a8098'; }}
          >
            {a}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 10, color: '#c5bfd0' }}>
          {words} w · {text.length} ch
        </span>
      </div>

      {/* ── Settings modal ── */}
      {panel === 'settings' && (
        <Overlay onClose={() => setPanel(null)}>
          <Modal title="Settings">
            <Field label="Claude API Key"
              hint="console.anthropic.com — saved to your Google Drive">
              <Inp type="password" value={tmpClaude} onChange={e => setTmpClaude(e.target.value)} placeholder="sk-ant-…" />
            </Field>
            <Row style={{ justifyContent: 'space-between' }}>
              <Btn onClick={logout} style={{ color: '#c46a6a', borderColor: '#e8c8c8' }}>Logout</Btn>
              <div style={{ display: 'flex', gap: 8 }}>
                <Btn onClick={() => setPanel(null)}>Cancel</Btn>
                <Btn accent onClick={saveSettings} disabled={loading}>
                  {loading ? '…' : 'Save'}
                </Btn>
              </div>
            </Row>
          </Modal>
        </Overlay>
      )}

      {/* ── File list modal ── */}
      {panel === 'files' && (
        <Overlay onClose={() => setPanel(null)}>
          <Modal title="Open from Google Drive">
            {files.length === 0
              ? <p style={{ fontSize: 13, color: '#a09898' }}>No files in scratchypad/ yet.</p>
              : files.map(f => (
                  <FileRow key={f.id} name={f.name} onClick={() => loadGFile(f.id, f.name)} />
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
              background: '#f0edf8', border: '1px solid #dbd5e8',
              borderRadius: 4, padding: '16px 18px',
              fontSize: 14, lineHeight: 1.75,
              color: '#363240', fontFamily: "'Lora', Georgia, serif",
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
    background: accent ? (hov ? '#8470b8' : '#9b85c4') : 'transparent',
    border: `1px solid ${accent ? '#9b85c4' : (hov ? '#b0a8c0' : '#dedad5')}`,
    color: accent ? '#ffffff' : (hov ? '#4a4260' : '#8a8598'),
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
        background: 'rgba(130,120,150,0.35)',
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
      background: '#ffffff', border: '1px solid #dbd5e8',
      borderRadius: 8, padding: '26px 28px',
      width: wide ? 580 : 440, maxWidth: '92vw',
    }}>
      <div style={{ fontSize: 13, fontWeight: 500, color: '#9b85c4', marginBottom: 22, letterSpacing: '0.02em' }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function Field({ label, hint, children }) {
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

function Inp({ type = 'text', value, onChange, placeholder }) {
  return (
    <input type={type} value={value} onChange={onChange} placeholder={placeholder}
      style={{
        width: '100%', background: '#f7f6f4',
        border: '1px solid #d8d2e5', color: '#2a2825',
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
        fontSize: 12, fontFamily: "'DM Mono', monospace", color: '#7a7288',
        background: hov ? '#ece8f5' : 'transparent',
        border: `1px solid ${hov ? '#d8d0e8' : 'transparent'}`,
        marginBottom: 3, transition: 'all 0.1s',
      }}>
      {name}
    </div>
  );
}
