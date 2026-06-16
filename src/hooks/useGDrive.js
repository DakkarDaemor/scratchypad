import { GDRIVE_CLIENT_ID, KEYS, DEFAULT_AI_CONFIG } from '../constants';

const API   = 'https://www.googleapis.com';
const SCOPE = 'https://www.googleapis.com/auth/drive.file';

// ── Module-level token state (shared across all hook instances) ───────────
let _pending        = null; // deduplicate concurrent getToken() calls
let _proactiveTimer = null;

const storeToken = (accessToken, expiresIn) => {
  const expiry = Date.now() + (expiresIn - 60) * 1000;
  localStorage.setItem(KEYS.GDRIVE_TOKEN,  accessToken);
  localStorage.setItem(KEYS.GDRIVE_EXPIRY, String(expiry));
  scheduleProactiveRefresh(expiry);
  return accessToken;
};

const scheduleProactiveRefresh = expiryMs => {
  if (_proactiveTimer) clearTimeout(_proactiveTimer);
  const delay = expiryMs - Date.now() - 5 * 60 * 1000; // 5 min before expiry
  if (delay > 30_000) {
    _proactiveTimer = setTimeout(proactiveRefresh, delay);
  }
};

// Silent background refresh — does NOT use _pending, truly fire-and-forget.
// If it succeeds, localStorage gets a fresh token and scheduleProactiveRefresh
// is called again via storeToken, keeping the cycle going indefinitely.
// If it fails, the stale token is evicted so the next user action triggers
// interactive auth immediately instead of failing with a 401.
const proactiveRefresh = () => {
  const hint = localStorage.getItem(KEYS.GDRIVE_HINT);
  if (!hint || !window.google?.accounts?.oauth2) return;
  const tc = window.google.accounts.oauth2.initTokenClient({
    client_id: GDRIVE_CLIENT_ID,
    scope: SCOPE,
    hint,
    prompt: '',
    callback: resp => {
      if (resp.error) {
        localStorage.removeItem(KEYS.GDRIVE_TOKEN);
        localStorage.removeItem(KEYS.GDRIVE_EXPIRY);
        return;
      }
      storeToken(resp.access_token, resp.expires_in);
    },
    error_callback: () => {
      localStorage.removeItem(KEYS.GDRIVE_TOKEN);
      localStorage.removeItem(KEYS.GDRIVE_EXPIRY);
    },
  });
  tc.requestAccessToken();
};

const saveHint = async tok => {
  try {
    const r = await fetch(`${API}/oauth2/v3/userinfo`, { headers: { Authorization: `Bearer ${tok}` } });
    if (r.ok) {
      const { email } = await r.json();
      if (email) localStorage.setItem(KEYS.GDRIVE_HINT, email);
    }
  } catch {}
};

const getToken = () => {
  if (_pending) return _pending;
  const tok = localStorage.getItem(KEYS.GDRIVE_TOKEN);
  const exp = Number(localStorage.getItem(KEYS.GDRIVE_EXPIRY) || 0);
  if (tok && Date.now() < exp) {
    // Re-arm the proactive timer on every cached-hit (covers page reloads).
    scheduleProactiveRefresh(exp);
    return Promise.resolve(tok);
  }
  const hint = localStorage.getItem(KEYS.GDRIVE_HINT) || '';
  _pending = new Promise((resolve, reject) => {
    if (!window.google?.accounts?.oauth2) { reject(new Error('Google API not loaded')); return; }
    const tc = window.google.accounts.oauth2.initTokenClient({
      client_id: GDRIVE_CLIENT_ID,
      scope: SCOPE,
      ...(hint ? { hint, prompt: '' } : {}),
      callback: resp => {
        if (resp.error) { reject(new Error(resp.error_description || resp.error)); return; }
        storeToken(resp.access_token, resp.expires_in);
        if (!hint) saveHint(resp.access_token);
        resolve(resp.access_token);
      },
      error_callback: e => reject(new Error(e.type || 'Auth failed')),
    });
    tc.requestAccessToken();
  }).finally(() => { _pending = null; });
  return _pending;
};

// ── Authenticated fetch with automatic 401 retry ─────────────────────────
const authFetch = async (path, { headers: extra = {}, ...opts } = {}) => {
  const tok = await getToken();
  const r   = await fetch(`${API}${path}`, {
    ...opts,
    headers: { Authorization: `Bearer ${tok}`, ...extra },
  });
  if (r.status === 401) {
    // Token was rejected server-side (clock drift, revocation, etc.) — evict and retry once.
    localStorage.removeItem(KEYS.GDRIVE_TOKEN);
    localStorage.removeItem(KEYS.GDRIVE_EXPIRY);
    _pending = null;
    const newTok = await getToken();
    return fetch(`${API}${path}`, {
      ...opts,
      headers: { Authorization: `Bearer ${newTok}`, ...extra },
    });
  }
  return r;
};

// ── Hook ─────────────────────────────────────────────────────────────────
export function useGDrive() {
  const logout = () => {
    if (_proactiveTimer) clearTimeout(_proactiveTimer);
    _proactiveTimer = null;
    _pending        = null;
    const tok = localStorage.getItem(KEYS.GDRIVE_TOKEN);
    if (tok && window.google?.accounts?.oauth2) window.google.accounts.oauth2.revoke(tok);
    [KEYS.GDRIVE_TOKEN, KEYS.GDRIVE_EXPIRY, KEYS.GDRIVE_FOLDER, KEYS.GDRIVE_CONFIG, KEYS.GDRIVE_HINT]
      .forEach(k => localStorage.removeItem(k));
  };

  const writeConfigFile = async config => {
    const body     = JSON.stringify(config);
    const cachedId = localStorage.getItem(KEYS.GDRIVE_CONFIG);
    if (cachedId) {
      await authFetch(`/upload/drive/v3/files/${cachedId}?uploadType=media`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body,
      });
    } else {
      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify({ name: 'scratchypad_config.json' })], { type: 'application/json' }));
      form.append('file',     new Blob([body], { type: 'application/json' }));
      const cr = await authFetch('/upload/drive/v3/files?uploadType=multipart', { method: 'POST', body: form });
      if (cr.ok) { const f = await cr.json(); localStorage.setItem(KEYS.GDRIVE_CONFIG, f.id); }
    }
  };

  const parseConfig = raw => {
    const provider = raw.provider || (raw.claudeKey ? 'claude' : DEFAULT_AI_CONFIG.provider);
    return { ...DEFAULT_AI_CONFIG, ...raw, provider };
  };

  const loadConfig = async () => {
    const cachedId = localStorage.getItem(KEYS.GDRIVE_CONFIG);
    if (cachedId) {
      const r = await authFetch(`/drive/v3/files/${cachedId}?alt=media`);
      if (r.ok) { const raw = await r.json().catch(() => ({})); return parseConfig(raw); }
      localStorage.removeItem(KEYS.GDRIVE_CONFIG);
    }
    const q  = encodeURIComponent("name='scratchypad_config.json' and trashed=false");
    const sr = await authFetch(`/drive/v3/files?q=${q}&fields=files(id)`);
    if (!sr.ok) return { ...DEFAULT_AI_CONFIG };
    const found = await sr.json();
    if (found.files?.length) {
      const id = found.files[0].id;
      localStorage.setItem(KEYS.GDRIVE_CONFIG, id);
      const r = await authFetch(`/drive/v3/files/${id}?alt=media`);
      if (r.ok) { const raw = await r.json().catch(() => ({})); return parseConfig(raw); }
    } else {
      await writeConfigFile({ ...DEFAULT_AI_CONFIG });
    }
    return { ...DEFAULT_AI_CONFIG };
  };

  const ensureFolder = async () => {
    const cached = localStorage.getItem(KEYS.GDRIVE_FOLDER);
    if (cached) return cached;
    const q = encodeURIComponent("name='scratchypad' and mimeType='application/vnd.google-apps.folder' and trashed=false");
    const r = await authFetch(`/drive/v3/files?q=${q}&fields=files(id)`);
    if (!r.ok) throw new Error(`Drive error ${r.status}`);
    const data = await r.json();
    if (data.files?.length) {
      localStorage.setItem(KEYS.GDRIVE_FOLDER, data.files[0].id);
      return data.files[0].id;
    }
    const cr = await authFetch('/drive/v3/files', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'scratchypad', mimeType: 'application/vnd.google-apps.folder' }),
    });
    if (!cr.ok) throw new Error(`Create folder failed ${cr.status}`);
    const folder = await cr.json();
    localStorage.setItem(KEYS.GDRIVE_FOLDER, folder.id);
    return folder.id;
  };

  const backupFile = async (fileId, filename, folderId) => {
    const bakName = `${filename}.bak`;
    const q  = encodeURIComponent(`name='${bakName}' and '${folderId}' in parents and trashed=false`);
    const sr = await authFetch(`/drive/v3/files?q=${q}&fields=files(id)`);
    const { files } = await sr.json();
    if (files?.length) {
      await authFetch(`/drive/v3/files/${files[0].id}`, { method: 'DELETE' });
    }
    await authFetch(`/drive/v3/files/${fileId}/copy`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: bakName, parents: [folderId] }),
    });
  };

  const listFiles = async () => {
    const folderId = await ensureFolder();
    const q = encodeURIComponent(`'${folderId}' in parents and trashed=false`);
    const r = await authFetch(`/drive/v3/files?q=${q}&fields=files(id,name,modifiedTime)&orderBy=modifiedTime+desc`);
    if (!r.ok) throw new Error(`List failed ${r.status}`);
    const data = await r.json();
    return data.files || [];
  };

  const saveFile = async tab => {
    const folderId = await ensureFolder();
    const q  = encodeURIComponent(`name='${tab.filename}' and '${folderId}' in parents and trashed=false`);
    const sr = await authFetch(`/drive/v3/files?q=${q}&fields=files(id)`);
    if (!sr.ok) throw new Error(`Search failed ${sr.status}`);
    const found   = await sr.json();
    const content = new Blob([tab.text], { type: 'text/plain' });
    let savedId   = tab.fileId;
    if (found.files?.length) {
      savedId = found.files[0].id;
      await backupFile(savedId, tab.filename, folderId).catch(() => {});
      const ur = await authFetch(`/upload/drive/v3/files/${savedId}?uploadType=media`, {
        method: 'PATCH', headers: { 'Content-Type': 'text/plain' }, body: content,
      });
      if (!ur.ok) throw new Error(`Update failed ${ur.status}`);
    } else {
      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify({ name: tab.filename, parents: [folderId] })], { type: 'application/json' }));
      form.append('file', content);
      const cr = await authFetch('/upload/drive/v3/files?uploadType=multipart', { method: 'POST', body: form });
      if (!cr.ok) throw new Error(`Upload failed ${cr.status}`);
      savedId = (await cr.json()).id;
    }
    return savedId;
  };

  const downloadFile = async fileId => {
    const r = await authFetch(`/drive/v3/files/${fileId}?alt=media`);
    if (!r.ok) throw new Error(`Download failed ${r.status}`);
    return r.text();
  };

  const deleteFile = async fileId => {
    const r = await authFetch(`/drive/v3/files/${fileId}`, { method: 'DELETE' });
    if (!r.ok) throw new Error(`Delete failed ${r.status}`);
  };

  return { getToken, logout, loadConfig, writeConfigFile, listFiles, saveFile, downloadFile, deleteFile };
}
