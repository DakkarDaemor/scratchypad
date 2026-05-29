import { GDRIVE_CLIENT_ID, KEYS, DEFAULT_AI_CONFIG } from '../constants';

const API = 'https://www.googleapis.com';

export function useGDrive() {
  const authFetch = (tok, path, { headers: extra = {}, ...opts } = {}) =>
    fetch(`${API}${path}`, { ...opts, headers: { Authorization: `Bearer ${tok}`, ...extra } });

  const getToken = () => new Promise((resolve, reject) => {
    if (!window.google?.accounts?.oauth2) { reject(new Error('Google API not loaded')); return; }
    const tok = localStorage.getItem(KEYS.GDRIVE_TOKEN);
    const exp = Number(localStorage.getItem(KEYS.GDRIVE_EXPIRY) || 0);
    if (tok && Date.now() < exp) { resolve(tok); return; }
    const tc = window.google.accounts.oauth2.initTokenClient({
      client_id: GDRIVE_CLIENT_ID,
      scope: 'https://www.googleapis.com/auth/drive.file',
      callback: resp => {
        if (resp.error) { reject(new Error(resp.error_description || resp.error)); return; }
        localStorage.setItem(KEYS.GDRIVE_TOKEN, resp.access_token);
        localStorage.setItem(KEYS.GDRIVE_EXPIRY, String(Date.now() + (resp.expires_in - 60) * 1000));
        resolve(resp.access_token);
      },
      error_callback: e => reject(new Error(e.type || 'Auth failed')),
    });
    tc.requestAccessToken();
  });

  const logout = () => {
    const tok = localStorage.getItem(KEYS.GDRIVE_TOKEN);
    if (tok && window.google?.accounts?.oauth2) window.google.accounts.oauth2.revoke(tok);
    [KEYS.GDRIVE_TOKEN, KEYS.GDRIVE_EXPIRY, KEYS.GDRIVE_FOLDER, KEYS.GDRIVE_CONFIG].forEach(k => localStorage.removeItem(k));
  };

  const writeConfigFile = async (tok, config) => {
    const body     = JSON.stringify(config);
    const cachedId = localStorage.getItem(KEYS.GDRIVE_CONFIG);
    if (cachedId) {
      await authFetch(tok, `/upload/drive/v3/files/${cachedId}?uploadType=media`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body,
      });
    } else {
      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify({ name: 'scratchypad_config.json' })], { type: 'application/json' }));
      form.append('file', new Blob([body], { type: 'application/json' }));
      const cr = await authFetch(tok, '/upload/drive/v3/files?uploadType=multipart', { method: 'POST', body: form });
      if (cr.ok) { const f = await cr.json(); localStorage.setItem(KEYS.GDRIVE_CONFIG, f.id); }
    }
  };

  const parseConfig = raw => {
    const provider = raw.provider || (raw.claudeKey ? 'claude' : DEFAULT_AI_CONFIG.provider);
    return { ...DEFAULT_AI_CONFIG, ...raw, provider };
  };

  const loadConfig = async tok => {
    const cachedId = localStorage.getItem(KEYS.GDRIVE_CONFIG);
    if (cachedId) {
      const r = await authFetch(tok, `/drive/v3/files/${cachedId}?alt=media`);
      if (r.ok) { const raw = await r.json().catch(() => ({})); return parseConfig(raw); }
      localStorage.removeItem(KEYS.GDRIVE_CONFIG);
    }
    const q  = encodeURIComponent("name='scratchypad_config.json' and trashed=false");
    const sr = await authFetch(tok, `/drive/v3/files?q=${q}&fields=files(id)`);
    if (!sr.ok) return { ...DEFAULT_AI_CONFIG };
    const found = await sr.json();
    if (found.files?.length) {
      const id = found.files[0].id;
      localStorage.setItem(KEYS.GDRIVE_CONFIG, id);
      const r = await authFetch(tok, `/drive/v3/files/${id}?alt=media`);
      if (r.ok) { const raw = await r.json().catch(() => ({})); return parseConfig(raw); }
    } else {
      await writeConfigFile(tok, { ...DEFAULT_AI_CONFIG });
    }
    return { ...DEFAULT_AI_CONFIG };
  };

  const ensureFolder = async tok => {
    const cached = localStorage.getItem(KEYS.GDRIVE_FOLDER);
    if (cached) return cached;
    const q = encodeURIComponent("name='scratchypad' and mimeType='application/vnd.google-apps.folder' and trashed=false");
    const r = await authFetch(tok, `/drive/v3/files?q=${q}&fields=files(id)`);
    if (!r.ok) throw new Error(`Drive error ${r.status}`);
    const data = await r.json();
    if (data.files?.length) {
      localStorage.setItem(KEYS.GDRIVE_FOLDER, data.files[0].id);
      return data.files[0].id;
    }
    const cr = await authFetch(tok, '/drive/v3/files', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'scratchypad', mimeType: 'application/vnd.google-apps.folder' }),
    });
    if (!cr.ok) throw new Error(`Create folder failed ${cr.status}`);
    const folder = await cr.json();
    localStorage.setItem(KEYS.GDRIVE_FOLDER, folder.id);
    return folder.id;
  };

  const backupFile = async (tok, fileId, filename, folderId) => {
    const bakName = `${filename}.bak`;
    const q = encodeURIComponent(`name='${bakName}' and '${folderId}' in parents and trashed=false`);
    const sr = await authFetch(tok, `/drive/v3/files?q=${q}&fields=files(id)`);
    const { files } = await sr.json();
    if (files?.length) {
      await authFetch(tok, `/drive/v3/files/${files[0].id}`, { method: 'DELETE' });
    }
    await authFetch(tok, `/drive/v3/files/${fileId}/copy`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: bakName, parents: [folderId] }),
    });
  };

  const listFiles = async () => {
    const tok      = await getToken();
    const folderId = await ensureFolder(tok);
    const q        = encodeURIComponent(`'${folderId}' in parents and trashed=false`);
    const r        = await authFetch(tok, `/drive/v3/files?q=${q}&fields=files(id,name,modifiedTime)&orderBy=modifiedTime+desc`);
    if (!r.ok) throw new Error(`List failed ${r.status}`);
    const data = await r.json();
    return (data.files || []).filter(f => !f.name.endsWith('.bak'));
  };

  const saveFile = async tab => {
    const tok      = await getToken();
    const folderId = await ensureFolder(tok);
    const q        = encodeURIComponent(`name='${tab.filename}' and '${folderId}' in parents and trashed=false`);
    const sr       = await authFetch(tok, `/drive/v3/files?q=${q}&fields=files(id)`);
    if (!sr.ok) throw new Error(`Search failed ${sr.status}`);
    const found   = await sr.json();
    const content = new Blob([tab.text], { type: 'text/plain' });
    let savedId   = tab.fileId;
    if (found.files?.length) {
      savedId = found.files[0].id;
      await backupFile(tok, savedId, tab.filename, folderId).catch(() => {});
      const ur = await authFetch(tok, `/upload/drive/v3/files/${savedId}?uploadType=media`, {
        method: 'PATCH', headers: { 'Content-Type': 'text/plain' }, body: content,
      });
      if (!ur.ok) throw new Error(`Update failed ${ur.status}`);
    } else {
      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify({ name: tab.filename, parents: [folderId] })], { type: 'application/json' }));
      form.append('file', content);
      const cr = await authFetch(tok, '/upload/drive/v3/files?uploadType=multipart', { method: 'POST', body: form });
      if (!cr.ok) throw new Error(`Upload failed ${cr.status}`);
      savedId = (await cr.json()).id;
    }
    return savedId;
  };

  const downloadFile = async fileId => {
    const tok = await getToken();
    const r   = await authFetch(tok, `/drive/v3/files/${fileId}?alt=media`);
    if (!r.ok) throw new Error(`Download failed ${r.status}`);
    return r.text();
  };

  const deleteFile = async fileId => {
    const tok = await getToken();
    const r   = await authFetch(tok, `/drive/v3/files/${fileId}`, { method: 'DELETE' });
    if (!r.ok) throw new Error(`Delete failed ${r.status}`);
  };

  return { getToken, logout, loadConfig, writeConfigFile, listFiles, saveFile, downloadFile, deleteFile };
}
