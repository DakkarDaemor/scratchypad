import { useState } from 'react';
import { writeSnippet } from '../utils';

export function useDriveOps({ drive, session, flash, setLoading, isLarge, setSidebarOpen, sidebarVisible }) {
  const [driveFiles, setDriveFiles] = useState([]);
  const [driveLoad, setDriveLoad] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { fileId, name }
  const [restoreConfirm, setRestoreConfirm] = useState(null); // { bakFileId, bakName, originalName }

  const driveNames = () => new Set(driveFiles.map(f => f.name));

  const refreshDriveFiles = async () => {
    setDriveLoad(true);
    try {
      setDriveFiles(await drive.listFiles());
    } catch (e) { flash(`Refresh failed: ${e.message}`, 'err'); }
    setDriveLoad(false);
  };

  const saveTab = async tabId => {
    const tab = session.getTab(tabId);
    if (!tab) return;
    setLoading(true); flash('Saving…');
    try {
      const savedId = await drive.saveFile(tab);
      writeSnippet(savedId, tab.text);
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
      writeSnippet(fileId, text);
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

  const handleRestoreBackup = (bakFileId, bakName) => {
    const originalName = bakName.endsWith('.bak') ? bakName.slice(0, -4) : bakName;
    setRestoreConfirm({ bakFileId, bakName, originalName });
  };

  const confirmRestore = async () => {
    if (!restoreConfirm) return;
    setLoading(true);
    try {
      const text = await drive.downloadFile(restoreConfirm.bakFileId);
      await drive.saveFile({ filename: restoreConfirm.originalName, text, fileId: null });
      session.tabs
        .filter(t => t.filename === restoreConfirm.originalName)
        .forEach(t => session.updateTab(t.id, { text, dirty: false }));
      flash('Backup ripristinato ✓', 'ok');
      setRestoreConfirm(null);
      refreshDriveFiles();
    } catch (e) { flash(`Restore failed: ${e.message}`, 'err'); setRestoreConfirm(null); }
    setLoading(false);
  };

  return {
    driveFiles, driveLoad,
    deleteConfirm, setDeleteConfirm,
    restoreConfirm, setRestoreConfirm,
    driveNames, refreshDriveFiles,
    saveTab, loadFromDrive,
    handleDeleteFile, handleRestoreBackup, confirmRestore,
  };
}
