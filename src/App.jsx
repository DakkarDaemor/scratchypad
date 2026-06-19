import { useState, useEffect, useRef, useCallback } from 'react';
import { FONTS, KEYS, FONT_MIN, FONT_MAX, FONT_DEFAULT, DEFAULT_AI_CONFIG } from './constants';
import { readSnippetIndex } from './utils';
import { useGDrive } from './hooks/useGDrive';
import { useAI } from './hooks/useAI';
import { useSession } from './hooks/useSession';
import { useSwipe } from './hooks/useSwipe';
import { useDictation } from './hooks/useDictation';
import { useDriveOps } from './hooks/useDriveOps';
import { useAIActions } from './hooks/useAIActions';
import { LoginScreen } from './components/LoginScreen';
import { TopBar } from './components/TopBar';
import { TabBar } from './components/TabBar';
import { Sidebar } from './components/Sidebar';
import { EditorPane } from './components/EditorPane';
import { AIBar } from './components/AIBar';
import { SettingsModal } from './components/SettingsModal';
import { AIResultModal } from './components/AIResultModal';
import { AppDialogs } from './components/AppDialogs';
import s from './App.module.css';

export default function ScratchyPad() {
  const session = useSession();
  const drive   = useGDrive();

  const [aiConfig,        setAiConfig]        = useState({ ...DEFAULT_AI_CONFIG });
  const [tmpConfig,       setTmpConfig]        = useState({ ...DEFAULT_AI_CONFIG });
  const [isLoggedIn,      setIsLoggedIn]       = useState(false);
  const [panel,           setPanel]            = useState(null);
  const [status,          setStatus]           = useState({ msg: '', type: 'info' });
  const [errorDialog,     setErrorDialog]      = useState('');
  const [closeTabConfirm, setCloseTabConfirm]  = useState(null); // { id, filename }
  const [loading,         setLoading]          = useState(false);
  const [findTrigger,     setFindTrigger]      = useState(null);
  const [sidebarOpen,     setSidebarOpen]      = useState(false);
  const [winW,            setWinW]             = useState(window.innerWidth);
  const [fontSize,        setFontSize]         = useState(() => {
    const n = Number(localStorage.getItem(KEYS.FONT_SIZE));
    return n >= FONT_MIN && n <= FONT_MAX ? n : FONT_DEFAULT;
  });
  const [hiddenActions,   setHiddenActions]    = useState(() => {
    try { return JSON.parse(localStorage.getItem(KEYS.HIDDEN_ACTIONS) || '[]'); } catch { return []; }
  });

  const leftTaRef     = useRef(null);
  const rightTaRef    = useRef(null);
  const flashTimerRef = useRef(null);

  const isMobile       = winW < 680;
  const canSplit       = winW >= 900;
  const isLarge        = winW >= 1200;
  const sidebarVisible = isLarge || sidebarOpen;

  /* ── Flash helper ── */
  const flash = (msg, type = 'info', persist = false) => {
    if (type === 'err') { setErrorDialog(msg); return; }
    clearTimeout(flashTimerRef.current);
    setStatus({ msg, type });
    if (!persist) {
      flashTimerRef.current = setTimeout(() => setStatus({ msg: '', type: 'info' }), 3000);
    }
  };
  const clearStatus = useCallback(() => {
    clearTimeout(flashTimerRef.current);
    setStatus({ msg: '', type: 'info' });
  }, []);

  /* ── Derived hooks ── */
  const driveOps = useDriveOps({ drive, session, flash, setLoading, isLarge, setSidebarOpen, sidebarVisible });
  const ai       = useAI(aiConfig);
  const aiAct    = useAIActions({ ai, session, leftTaRef, rightTaRef, flash, clearStatus, setLoading, setPanel });

  /* ── Dictation ── */
  const insertDictation = useCallback(transcript => {
    const pane  = session.focusedPane;
    const tabId = pane === 'left' ? session.leftTabId : session.rightTabId;
    const tab   = session.getTab(tabId);
    const ta    = (pane === 'left' ? leftTaRef : rightTaRef).current;
    if (!tab) return;
    const t   = tab.text;
    const pos = ta ? ta.selectionStart : t.length;
    session.updateTab(tabId, { text: t.substring(0, pos) + transcript + t.substring(pos), dirty: true });
    if (ta) requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = pos + transcript.length; });
  }, [session, leftTaRef, rightTaRef]);

  const dictation = useDictation(insertDictation);
  const [dictationMode, setDictationMode] = useState(false);
  useEffect(() => { if (!dictationMode) dictation.stop(); }, [dictationMode]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDictStop = useCallback(() => {
    dictation.stop(); insertDictation('\n');
  }, [dictation, insertDictation]);

  /* ── Swipe ── */
  const swipeHandlers = useSwipe({
    enabled: isMobile,
    onSwipeLeft: () => {
      const idx  = session.tabs.findIndex(t => t.id === session.focusedId);
      const next = session.tabs[idx + 1];
      if (next) session.setFocusedTab(next.id);
    },
    onSwipeRight: () => {
      const idx  = session.tabs.findIndex(t => t.id === session.focusedId);
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

  useEffect(() => { localStorage.setItem(KEYS.FONT_SIZE, String(fontSize)); }, [fontSize]);
  useEffect(() => { localStorage.setItem(KEYS.HIDDEN_ACTIONS, JSON.stringify(hiddenActions)); }, [hiddenActions]);

  useEffect(() => {
    const tok  = localStorage.getItem(KEYS.GDRIVE_TOKEN);
    const exp  = Number(localStorage.getItem(KEYS.GDRIVE_EXPIRY) || 0);
    const hint = localStorage.getItem(KEYS.GDRIVE_HINT);

    const autoLogin = () => {
      setLoading(true);
      drive.loadConfig()
        .then(cfg => { setAiConfig(cfg); setTmpConfig(cfg); setIsLoggedIn(true); syncOpenTabs(session.tabs); })
        .catch(() => {})
        .finally(() => setLoading(false));
    };

    if (tok && Date.now() < exp) {
      autoLogin();
    } else if (hint) {
      // Token scaduto ma utente noto: tenta refresh silenzioso (prompt:'') senza UI
      if (window.google?.accounts?.oauth2) {
        autoLogin();
      } else {
        // GIS non ancora caricato (script async) — aspetta il callback
        const prev = window.onGoogleLibraryLoad;
        window.onGoogleLibraryLoad = () => { if (prev) prev(); autoLogin(); };
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (sidebarVisible && isLoggedIn) driveOps.refreshDriveFiles();
  }, [sidebarVisible, isLoggedIn]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Auth ── */
  const syncOpenTabs = async tabs => {
    await Promise.all(
      tabs.filter(t => t.fileId && !t.dirty).map(async tab => {
        try { session.updateTab(tab.id, { text: await drive.downloadFile(tab.fileId) }); } catch {}
      })
    );
  };

  const isAiConfigured = cfg => {
    const { provider, claudeKey, openrouterKey, groqKey, openaiKey, geminiKey } = cfg || {};
    if (provider === 'openrouter') return !!openrouterKey;
    if (provider === 'groq')       return !!groqKey;
    if (provider === 'openai')     return !!openaiKey;
    if (provider === 'gemini')     return !!geminiKey;
    return !!claudeKey;
  };

  const login = async () => {
    setLoading(true);
    try {
      const cfg  = await drive.loadConfig();
      const tabs = session.tabs;
      setAiConfig(cfg); setTmpConfig(cfg); setIsLoggedIn(true);
      syncOpenTabs(tabs);
    } catch (e) { flash(`Login failed: ${e.message}`, 'err'); }
    setLoading(false);
  };

  const logout = () => {
    drive.logout();
    setIsLoggedIn(false);
    setAiConfig({ ...DEFAULT_AI_CONFIG });
    setTmpConfig({ ...DEFAULT_AI_CONFIG });
    setPanel(null);
  };

  /* ── Tab handlers ── */
  const handleNewTab = () => {
    session.addNewTab(driveOps.driveNames());
    if (!isLarge) setSidebarOpen(false);
  };

  const handleCloseTab = id => {
    const tab = session.getTab(id);
    if (tab?.dirty) { setCloseTabConfirm({ id, filename: tab.filename }); return; }
    session.closeTab(id, driveOps.driveNames());
  };

  const handleRenameTab = (id, name) => {
    const tab = session.getTab(id);
    if (session.tabs.some(t => t.id !== id && t.filename === name)) {
      flash(`"${name}" è già usato da un'altra tab`, 'warn'); return;
    }
    if (driveOps.driveFiles.some(f => f.name === name && f.id !== tab?.fileId)) {
      flash(`"${name}" è un file già esistente`, 'warn'); return;
    }
    session.updateTab(id, { filename: name });
  };

  /* ── Settings ── */
  const openSettings = () => { setTmpConfig(aiConfig); setPanel('settings'); };

  const saveSettings = async () => {
    setLoading(true);
    try {
      await drive.writeConfigFile(tmpConfig);
      setAiConfig(tmpConfig); setPanel(null); flash('Settings saved ✓', 'ok');
    } catch (e) { flash(`Save failed: ${e.message}`, 'err'); }
    setLoading(false);
  };

  /* ── Render ── */
  const resizeFont    = delta => setFontSize(prev => Math.min(FONT_MAX, Math.max(FONT_MIN, prev + delta)));
  const focusedTab    = session.getTab(session.focusedId);
  const focusedText   = focusedTab?.text || '';
  const words         = focusedText.trim() ? focusedText.trim().split(/\s+/).length : 0;
  const snippetIndex  = readSnippetIndex();
  const tabColorsByFileId = Object.fromEntries(
    session.tabs.filter(t => t.fileId && t.color).map(t => [t.fileId, t.color])
  );

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
        onSave={() => driveOps.saveTab(session.focusedId)}
        onOpenSettings={openSettings}
        dictationMode={dictationMode}
        onToggleDictationMode={() => setDictationMode(m => !m)}
        dictationSupported={dictation.supported}
        onOpenFind={() => setFindTrigger('find')}
        onOpenFindReplace={() => setFindTrigger('replace')}
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
        onColorTab={(tabId, color) => session.updateTab(tabId, { color })}
      />

      <div className={s.content}>
        {isMobile
          ? <Sidebar open={sidebarOpen} isMobile={true} onClose={() => setSidebarOpen(false)}
              files={driveOps.driveFiles} loading={driveOps.driveLoad}
              snippets={snippetIndex} fileColors={tabColorsByFileId}
              openTabFileIds={new Set(session.tabs.map(t => t.fileId).filter(Boolean))}
              onRefresh={driveOps.refreshDriveFiles} onOpenFile={driveOps.loadFromDrive}
              onRestoreBackup={driveOps.handleRestoreBackup} onNewTab={handleNewTab}
              onDeleteFile={(fileId, name) => driveOps.setDeleteConfirm({ fileId, name })}
            />
          : <div className={s.sidebarWrapper} style={{ width: sidebarVisible ? 220 : 0 }}>
              <Sidebar open={sidebarVisible} isMobile={false} onClose={() => setSidebarOpen(false)}
                files={driveOps.driveFiles} loading={driveOps.driveLoad}
                snippets={snippetIndex} fileColors={tabColorsByFileId}
                openTabFileIds={new Set(session.tabs.map(t => t.fileId).filter(Boolean))}
                onRefresh={driveOps.refreshDriveFiles} onOpenFile={driveOps.loadFromDrive}
                onRestoreBackup={driveOps.handleRestoreBackup} onNewTab={handleNewTab}
                onDeleteFile={(fileId, name) => driveOps.setDeleteConfirm({ fileId, name })}
              />
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
            markdownEnabled={!!aiConfig.markdownMode}
            findTrigger={findTrigger}
            onFindTriggered={() => setFindTrigger(null)}
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
                markdownEnabled={!!aiConfig.markdownMode}
                findTrigger={findTrigger}
                onFindTriggered={() => setFindTrigger(null)}
              />
            </>
          )}
        </div>
      </div>

      <AIBar
        loading={loading}
        wordCount={words}
        charCount={focusedText.length}
        onAction={aiAct.runAI}
        aiConfigured={isAiConfigured(aiConfig)}
        customActions={aiConfig.customActions || []}
        hiddenActions={hiddenActions}
        onHiddenActionsChange={setHiddenActions}
        onOpenSettings={openSettings}
        status={status}
        dictationMode={dictationMode}
        dictating={dictation.active}
        onDictStart={dictation.start}
        onDictStop={handleDictStop}
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
          label={aiAct.aiLabel}
          result={aiAct.aiResult}
          append={aiAct.aiAppend}
          onDiscard={() => { setPanel(null); aiAct.setAiResult(''); }}
          onNewTab={aiAct.applyResultNewTab}
          onApply={aiAct.applyResult}
        />
      )}

      <AppDialogs
        deleteConfirm={driveOps.deleteConfirm}
        onCancelDelete={() => driveOps.setDeleteConfirm(null)}
        onConfirmDelete={driveOps.handleDeleteFile}
        closeTabConfirm={closeTabConfirm}
        onCancelCloseTab={() => setCloseTabConfirm(null)}
        onConfirmCloseTab={() => { session.closeTab(closeTabConfirm.id, driveOps.driveNames()); setCloseTabConfirm(null); }}
        restoreConfirm={driveOps.restoreConfirm}
        onCancelRestore={() => driveOps.setRestoreConfirm(null)}
        onConfirmRestore={driveOps.confirmRestore}
        errorDialog={errorDialog}
        onCloseError={() => setErrorDialog('')}
        loading={loading}
      />
    </div>
  );
}
