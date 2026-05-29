import { useState, useEffect, useRef, useCallback } from 'react';
import { FONTS, KEYS, FONT_MIN, FONT_MAX, FONT_DEFAULT, DEFAULT_AI_CONFIG } from './constants';
import { mkTab } from './utils';
import { useGDrive } from './hooks/useGDrive';
import { useAI } from './hooks/useAI';
import { useSession } from './hooks/useSession';
import { useSwipe } from './hooks/useSwipe';
import { useDictation } from './hooks/useDictation';
import { LoginScreen } from './components/LoginScreen';
import { TopBar } from './components/TopBar';
import { TabBar } from './components/TabBar';
import { Sidebar } from './components/Sidebar';
import { EditorPane } from './components/EditorPane';
import { AIBar } from './components/AIBar';
import { SettingsModal } from './components/SettingsModal';
import { AIResultModal } from './components/AIResultModal';
import { Overlay, Modal, Btn, Row } from './ui';
import s from './App.module.css';

export default function ScratchyPad() {
  const session = useSession();
  const drive   = useGDrive();

  const [aiConfig,       setAiConfig]       = useState({ ...DEFAULT_AI_CONFIG });
  const [tmpConfig,      setTmpConfig]      = useState({ ...DEFAULT_AI_CONFIG });
  const [isLoggedIn,     setIsLoggedIn]     = useState(false);
  const [panel,          setPanel]          = useState(null);
  const [status,         setStatus]         = useState({ msg: '', type: 'info' });
  const [errorDialog,    setErrorDialog]    = useState('');
  const [deleteConfirm,  setDeleteConfirm]  = useState(null); // { fileId, name }
  const [loading,        setLoading]        = useState(false);
  const [aiResult,       setAiResult]       = useState('');
  const [aiLabel,        setAiLabel]        = useState('');
  const [sidebarOpen,    setSidebarOpen]    = useState(false);
  const [driveFiles,     setDriveFiles]     = useState([]);
  const [driveLoad,      setDriveLoad]      = useState(false);
  const [winW,           setWinW]           = useState(window.innerWidth);
  const [fontSize,       setFontSize]       = useState(() => {
    const n = Number(localStorage.getItem(KEYS.FONT_SIZE));
    return n >= FONT_MIN && n <= FONT_MAX ? n : FONT_DEFAULT;
  });

  const leftTaRef  = useRef(null);
  const rightTaRef = useRef(null);

  const insertDictation = useCallback(transcript => {
    const pane  = session.focusedPane;
    const tabId = pane === 'left' ? session.leftTabId : session.rightTabId;
    const tab   = session.getTab(tabId);
    const ta    = (pane === 'left' ? leftTaRef : rightTaRef).current;
    if (!tab) return;
    const t   = tab.text;
    const pos = ta ? ta.selectionStart : t.length;
    const newText = t.substring(0, pos) + transcript + t.substring(pos);
    session.updateTab(tabId, { text: newText, dirty: true });
    if (ta) requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = pos + transcript.length; });
  }, [session, leftTaRef, rightTaRef]);

  const dictation = useDictation(insertDictation);
  const [dictationMode, setDictationMode] = useState(false);

  useEffect(() => { if (!dictationMode) dictation.stop(); }, [dictationMode]); // eslint-disable-line react-hooks/exhaustive-deps

  const ai             = useAI(aiConfig);
  const isMobile       = winW < 680;
  const canSplit       = winW >= 900;
  const isLarge        = winW >= 1200;
  const sidebarVisible = isLarge || sidebarOpen;

  /* ── Swipe (mobile tab navigation) ── */
  const swipeHandlers = useSwipe({
    enabled: isMobile,
    onSwipeLeft: () => {
      const idx = session.tabs.findIndex(t => t.id === session.focusedId);
      const next = session.tabs[idx + 1];
      if (next) session.setFocusedTab(next.id);
    },
    onSwipeRight: () => {
      const idx = session.tabs.findIndex(t => t.id === session.focusedId);
      const prev = session.tabs[idx - 1];
      if (prev) session.setFocusedTab(prev.id);
    },
  });

  /* ── Effects ── */
  useEffect(() => {
    const el = document.createElement('style');
    el.textContent = FONTS;
    document.head.appendChild(el);
    return () => document.head.removeChild(el);
  }, []);

  useEffect(() => {
    const h = () => setWinW(window.innerWidth);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  useEffect(() => {
    if (!canSplit && session.rightTabId) session.setRightTabId(null);
  }, [canSplit, session.rightTabId]);

  useEffect(() => {
    localStorage.setItem(KEYS.FONT_SIZE, String(fontSize));
  }, [fontSize]);

  useEffect(() => {
    const tok = localStorage.getItem('sp_gdrive_token');
    const exp = Number(localStorage.getItem('sp_gdrive_expiry') || 0);
    if (tok && Date.now() < exp) {
      drive.loadConfig(tok)
        .then(cfg => {
          setAiConfig(cfg); setTmpConfig(cfg); setIsLoggedIn(true);
          syncOpenTabs(session.tabs);
        })
        .catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (sidebarVisible && isLoggedIn) refreshDriveFiles();
  }, [sidebarVisible, isLoggedIn]);

  /* ── Helpers ── */
  const flash = (msg, type = 'info') => {
    if (type === 'err') { setErrorDialog(msg); return; }
    setStatus({ msg, type });
    setTimeout(() => setStatus({ msg: '', type: 'info' }), 3000);
  };

  const isAiConfigured = cfg => {
    const { provider, claudeKey, openrouterKey, groqKey } = cfg || {};
    if (provider === 'openrouter') return !!openrouterKey;
    if (provider === 'groq') return !!groqKey;
    return !!claudeKey;
  };

  const syncOpenTabs = async tabs => {
    const toSync = tabs.filter(t => t.fileId && !t.dirty);
    await Promise.all(toSync.map(async tab => {
      try {
        const text = await drive.downloadFile(tab.fileId);
        session.updateTab(tab.id, { text });
      } catch {}
    }));
  };

  const resizeFont = delta => setFontSize(prev => Math.min(FONT_MAX, Math.max(FONT_MIN, prev + delta)));

  const getSelected = () => {
    const ref = session.focusedPane === 'left' ? leftTaRef : rightTaRef;
    const tab = session.getTab(session.focusedId);
    const t   = tab?.text || '';
    const ta  = ref.current;
    if (!ta) return t;
    const sel = ta.value.substring(ta.selectionStart, ta.selectionEnd);
    return sel.trim() ? sel : t;
  };

  /* ── Auth ── */
  const login = async () => {
    setLoading(true);
    try {
      const tok  = await drive.getToken();
      const cfg  = await drive.loadConfig(tok);
      const tabs = session.tabs;
      setAiConfig(cfg); setTmpConfig(cfg);
      setIsLoggedIn(true);
      syncOpenTabs(tabs);
    } catch (e) { flash(`Login failed: ${e.message}`, 'err'); }
    setLoading(false);
  };

  const logout = () => {
    drive.logout();
    setIsLoggedIn(false); setAiConfig({ ...DEFAULT_AI_CONFIG }); setTmpConfig({ ...DEFAULT_AI_CONFIG }); setPanel(null);
  };

  /* ── Drive ── */
  const refreshDriveFiles = async () => {
    setDriveLoad(true);
    try {
      setDriveFiles(await drive.listFiles());
    } catch (e) { flash(`Refresh failed: ${e.message}`, 'err'); }
    setDriveLoad(false);
  };

  const driveNames = () => new Set(driveFiles.map(f => f.name));
  const handleNewTab   = () => session.addNewTab(driveNames());
  const handleCloseTab = id => session.closeTab(id, driveNames());
  const handleRenameTab = (id, name) => {
    const tab = session.getTab(id);
    if (session.tabs.some(t => t.id !== id && t.filename === name)) {
      flash(`"${name}" è già usato da un'altra tab`, 'warn'); return;
    }
    if (driveFiles.some(f => f.name === name && f.id !== tab?.fileId)) {
      flash(`"${name}" è un file già esistente`, 'warn'); return;
    }
    session.updateTab(id, { filename: name });
  };

  const saveTab = async (tabId = session.focusedId) => {
    const tab = session.getTab(tabId);
    if (!tab) return;
    setLoading(true); flash('Saving…');
    try {
      const savedId = await drive.saveFile(tab);
      session.updateTab(tabId, { fileId: savedId, dirty: false });
      flash('Saved ✓', 'ok');
      if (sidebarVisible) refreshDriveFiles();
    } catch (e) { flash(`Save failed: ${e.message}`, 'err'); }
    setLoading(false);
  };

  const loadFromDrive = async (fileId, name) => {
    setLoading(true);
    try {
      const text = await drive.downloadFile(fileId);
      session.openInTab(name, text, fileId);
      if (!isLarge) setSidebarOpen(false);
      flash('Loaded ✓', 'ok');
    } catch (e) { flash(`Load failed: ${e.message}`, 'err'); }
    setLoading(false);
  };

  const handleDeleteFile = async () => {
    if (!deleteConfirm) return;
    setLoading(true);
    try {
      await drive.deleteFile(deleteConfirm.fileId);
      session.tabs
        .filter(t => t.fileId === deleteConfirm.fileId)
        .forEach(t => session.updateTab(t.id, { fileId: null, dirty: true }));
      flash('Deleted ✓', 'ok');
      setDeleteConfirm(null);
      refreshDriveFiles();
    } catch (e) { flash(e.message, 'err'); setDeleteConfirm(null); }
    setLoading(false);
  };

  /* ── AI ── */
  const runAI = async action => {
    const content = getSelected();
    if (!content.trim()) { flash('Nothing to process', 'warn'); return; }
    setLoading(true); setAiLabel(action); flash(`Running "${action}"…`);
    try {
      const result = await ai.run(action, content);
      setAiResult(result); setPanel('result');
      setStatus({ msg: '', type: 'info' });
    } catch (e) { flash(`AI error: ${e.message}`, 'err'); }
    setLoading(false);
  };

  const applyResult = () => {
    const tab = session.getTab(session.focusedId);
    if (!tab) return;
    const ta = (session.focusedPane === 'left' ? leftTaRef : rightTaRef).current;
    let newText = aiResult;
    if (ta) {
      const { selectionStart: ss, selectionEnd: se } = ta;
      if (ss !== se) newText = tab.text.substring(0, ss) + aiResult + tab.text.substring(se);
    }
    session.updateTab(session.focusedId, { text: newText, dirty: true });
    setPanel(null); setAiResult('');
  };

  const applyResultNewTab = () => {
    const base = session.getTab(session.focusedId)?.filename || 'scratch.txt';
    const tab  = mkTab(session.getNextFilename(base), aiResult, null);
    session.openInTab(tab.filename, tab.text, null);
    setPanel(null); setAiResult('');
  };

  /* ── Settings ── */
  const saveSettings = async () => {
    setLoading(true);
    try {
      const tok = await drive.getToken();
      await drive.writeConfigFile(tok, tmpConfig);
      setAiConfig(tmpConfig); setPanel(null); flash('Settings saved ✓', 'ok');
    } catch (e) { flash(`Save failed: ${e.message}`, 'err'); }
    setLoading(false);
  };

  /* ── Render ── */
  const openSettings = () => { setTmpConfig(aiConfig); setPanel('settings'); };
  const focusedTab   = session.getTab(session.focusedId);
  const focusedText  = focusedTab?.text || '';
  const words        = focusedText.trim() ? focusedText.trim().split(/\s+/).length : 0;
  const sidebarProps = {
    files: driveFiles, loading: driveLoad,
    openTabFileIds: new Set(session.tabs.map(t => t.fileId).filter(Boolean)),
    onRefresh: refreshDriveFiles, onOpenFile: loadFromDrive,
    onNewTab: handleNewTab,
    onDeleteFile: (fileId, name) => setDeleteConfirm({ fileId, name }),
  };

  if (!isLoggedIn) {
    return <LoginScreen onLogin={login} loading={loading} status={status} />;
  }

  return (
    <div className={s.app}>
      <TopBar
        canToggleSidebar={!isLarge}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen(o => !o)}
        canSplit={canSplit}
        hasSplit={!!session.rightTabId}
        onToggleSplit={session.toggleSplit}
        loading={loading}
        onSave={() => saveTab()}
        onOpenSettings={openSettings}
        dictationMode={dictationMode}
        onToggleDictationMode={() => setDictationMode(m => !m)}
        dictationSupported={dictation.supported}
      />

      <TabBar
        tabs={session.tabs}
        focusedId={session.focusedId}
        leftTabId={session.leftTabId}
        rightTabId={session.rightTabId}
        focusedPane={session.focusedPane}
        isMobile={isMobile}
        onSelectTab={session.setFocusedTab}
        onCloseTab={handleCloseTab}
        onNewTab={handleNewTab}
        onRenameTab={handleRenameTab}
        onReorderTabs={session.reorderTabs}
      />

      <div className={s.content}>
        {isMobile
          ? <Sidebar open={sidebarOpen} isMobile={true} onClose={() => setSidebarOpen(false)} {...sidebarProps} />
          : <div className={s.sidebarWrapper} style={{ width: sidebarVisible ? 220 : 0 }}>
              <Sidebar open={sidebarVisible} isMobile={false} onClose={() => setSidebarOpen(false)} {...sidebarProps} />
            </div>
        }

        <div className={s.editors} {...(isMobile ? swipeHandlers : {})}>
          <EditorPane
            tab={session.getTab(session.leftTabId)}
            focused={session.focusedPane === 'left'}
            taRef={leftTaRef}
            hasSplit={!!session.rightTabId}
            isMobile={isMobile}
            onFocus={() => session.setFocusedPane('left')}
            onChange={text => session.updateTab(session.leftTabId, { text, dirty: true })}
            fontSize={fontSize}
            onFontResize={resizeFont}
          />
          {session.rightTabId && (
            <>
              <div className={s.splitDivider} />
              <EditorPane
                tab={session.getTab(session.rightTabId)}
                focused={session.focusedPane === 'right'}
                taRef={rightTaRef}
                hasSplit
                isMobile={isMobile}
                onFocus={() => session.setFocusedPane('right')}
                onChange={text => session.updateTab(session.rightTabId, { text, dirty: true })}
                fontSize={fontSize}
                onFontResize={resizeFont}
              />
            </>
          )}
        </div>
      </div>

      <AIBar
        loading={loading}
        wordCount={words}
        charCount={focusedText.length}
        onAction={runAI}
        aiConfigured={isAiConfigured(aiConfig)}
        onOpenSettings={openSettings}
        status={status}
        dictationMode={dictationMode}
        dictating={dictation.active}
        onDictStart={dictation.start}
        onDictStop={dictation.stop}
      />

      {panel === 'settings' && (
        <SettingsModal
          config={tmpConfig}
          onConfigChange={setTmpConfig}
          loading={loading}
          onSave={saveSettings}
          onLogout={logout}
          onClose={() => setPanel(null)}
        />
      )}

      {panel === 'result' && (
        <AIResultModal
          label={aiLabel}
          result={aiResult}
          onDiscard={() => { setPanel(null); setAiResult(''); }}
          onNewTab={applyResultNewTab}
          onApply={applyResult}
        />
      )}

      {deleteConfirm && (
        <Overlay onClose={() => setDeleteConfirm(null)} zIndex={300}>
          <Modal title="Delete file">
            <p style={{ fontSize: 13, color: '#5a5570', lineHeight: 1.6, marginBottom: 20 }}>
              Delete <strong>{deleteConfirm.name}</strong>? This cannot be undone.
            </p>
            <Row>
              <Btn onClick={() => setDeleteConfirm(null)}>Cancel</Btn>
              <Btn onClick={handleDeleteFile} disabled={loading}
                style={{ background: '#c46a6a', borderColor: '#c46a6a', color: '#fff' }}>
                {loading ? '…' : 'Delete'}
              </Btn>
            </Row>
          </Modal>
        </Overlay>
      )}

      {errorDialog && (
        <Overlay onClose={() => setErrorDialog('')} zIndex={300}>
          <Modal title="Errore">
            <p style={{ fontSize: 13, color: '#5a5570', lineHeight: 1.6, marginBottom: 20, whiteSpace: 'pre-wrap' }}>
              {errorDialog}
            </p>
            <Row>
              <Btn accent onClick={() => setErrorDialog('')}>OK</Btn>
            </Row>
          </Modal>
        </Overlay>
      )}
    </div>
  );
}
