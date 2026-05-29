import { useState, useEffect, useRef } from 'react';
import { FONTS, KEYS, FONT_MIN, FONT_MAX, FONT_DEFAULT, DEFAULT_AI_CONFIG } from './constants';
import { mkTab } from './utils';
import { useGDrive } from './hooks/useGDrive';
import { useAI } from './hooks/useAI';
import { useSession } from './hooks/useSession';
import { LoginScreen } from './components/LoginScreen';
import { TopBar } from './components/TopBar';
import { TabBar } from './components/TabBar';
import { Sidebar } from './components/Sidebar';
import { EditorPane } from './components/EditorPane';
import { AIBar } from './components/AIBar';
import { SettingsModal } from './components/SettingsModal';
import { AIResultModal } from './components/AIResultModal';

export default function ScratchyPad() {
  const session = useSession();
  const drive   = useGDrive();

  const [aiConfig,    setAiConfig]    = useState({ ...DEFAULT_AI_CONFIG });
  const [tmpConfig,   setTmpConfig]   = useState({ ...DEFAULT_AI_CONFIG });
  const [isLoggedIn,  setIsLoggedIn]  = useState(false);
  const [panel,       setPanel]       = useState(null);
  const [status,      setStatus]      = useState({ msg: '', type: 'info' });
  const [loading,     setLoading]     = useState(false);
  const [aiResult,    setAiResult]    = useState('');
  const [aiLabel,     setAiLabel]     = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [driveFiles,  setDriveFiles]  = useState([]);
  const [driveLoad,   setDriveLoad]   = useState(false);
  const [winW,        setWinW]        = useState(window.innerWidth);
  const [fontSize,    setFontSize]    = useState(() => {
    const n = Number(localStorage.getItem(KEYS.FONT_SIZE));
    return n >= FONT_MIN && n <= FONT_MAX ? n : FONT_DEFAULT;
  });

  const leftTaRef  = useRef(null);
  const rightTaRef = useRef(null);

  const ai       = useAI(aiConfig);
  const isMobile = winW < 680;
  const canSplit  = winW >= 900;

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
    if (sidebarOpen && isLoggedIn) refreshDriveFiles();
  }, [sidebarOpen, isLoggedIn]);

  /* ── Helpers ── */
  const flash = (msg, type = 'info') => {
    setStatus({ msg, type });
    setTimeout(() => setStatus({ msg: '', type: 'info' }), 3000);
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

  const saveTab = async (tabId = session.focusedId) => {
    const tab = session.getTab(tabId);
    if (!tab) return;
    setLoading(true); flash('Saving…');
    try {
      const savedId = await drive.saveFile(tab);
      session.updateTab(tabId, { fileId: savedId, dirty: false });
      flash('Saved ✓', 'ok');
      if (sidebarOpen) refreshDriveFiles();
    } catch (e) { flash(`Save failed: ${e.message}`, 'err'); }
    setLoading(false);
  };

  const loadFromDrive = async (fileId, name) => {
    setLoading(true);
    try {
      const text = await drive.downloadFile(fileId);
      session.openInTab(name, text, fileId);
      setSidebarOpen(false);
      flash('Loaded ✓', 'ok');
    } catch (e) { flash(`Load failed: ${e.message}`, 'err'); }
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
      const { selectionStart: s, selectionEnd: e } = ta;
      if (s !== e) newText = tab.text.substring(0, s) + aiResult + tab.text.substring(e);
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
  const focusedTab  = session.getTab(session.focusedId);
  const focusedText = focusedTab?.text || '';
  const words       = focusedText.trim() ? focusedText.trim().split(/\s+/).length : 0;

  if (!isLoggedIn) {
    return <LoginScreen onLogin={login} loading={loading} status={status} />;
  }

  return (
    <div style={{
      fontFamily: "'DM Sans', sans-serif", background: '#f7f6f4', color: '#2a2825',
      height: 'var(--app-height, 100dvh)', display: 'flex', flexDirection: 'column',
      overflow: 'hidden', position: 'relative',
    }}>
      <TopBar
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen(o => !o)}
        status={status}
        canSplit={canSplit}
        hasSplit={!!session.rightTabId}
        onToggleSplit={session.toggleSplit}
        loading={loading}
        onSave={() => saveTab()}
        onOpenSettings={() => { setTmpConfig(aiConfig); setPanel('settings'); }}
      />

      <TabBar
        tabs={session.tabs}
        focusedId={session.focusedId}
        leftTabId={session.leftTabId}
        rightTabId={session.rightTabId}
        focusedPane={session.focusedPane}
        isMobile={isMobile}
        onSelectTab={session.setFocusedTab}
        onCloseTab={session.closeTab}
        onNewTab={session.addNewTab}
        onRenameTab={(id, name) => session.updateTab(id, { filename: name })}
      />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
        {isMobile
          ? <Sidebar
              open={sidebarOpen}
              isMobile={true}
              files={driveFiles}
              loading={driveLoad}
              openTabFileIds={new Set(session.tabs.map(t => t.fileId).filter(Boolean))}
              onClose={() => setSidebarOpen(false)}
              onRefresh={refreshDriveFiles}
              onOpenFile={loadFromDrive}
              onNewTab={session.addNewTab}
            />
          : <div style={{ width: sidebarOpen ? 220 : 0, overflow: 'hidden', flexShrink: 0, transition: 'width 0.25s ease', alignSelf: 'stretch' }}>
              <Sidebar
                open={sidebarOpen}
                isMobile={false}
                files={driveFiles}
                loading={driveLoad}
                openTabFileIds={new Set(session.tabs.map(t => t.fileId).filter(Boolean))}
                onClose={() => setSidebarOpen(false)}
                onRefresh={refreshDriveFiles}
                onOpenFile={loadFromDrive}
                onNewTab={session.addNewTab}
              />
            </div>
        }

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
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
              <div style={{ width: 1, background: '#e2dedd', flexShrink: 0 }} />
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
    </div>
  );
}
