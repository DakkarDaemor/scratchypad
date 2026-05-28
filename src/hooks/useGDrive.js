import { GDRIVE_CLIENT_ID, KEYS } from '../constants';

export function useGDrive() {
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

  const writeConfigFile = async (tok, key) => {
    const body     = JSON.stringify({ claudeKey: key });
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
        method: 'POST', headers: { Authorization: `Bearer ${tok}` }, body: form,
      });
      if (cr.ok) { const f = await cr.json(); localStorage.setItem(KEYS.GDRIVE_CONFIG, f.id); }
    }
  };

  const loadConfig = async tok => {
    const cachedId = localStorage.getItem(KEYS.GDRIVE_CONFIG);
    if (cachedId) {
      const r = await fetch(`https://www.googleapis.com/drive/v3/files/${cachedId}?alt=media`, {
        headers: { Authorization: `Bearer ${tok}` },
      });
      if (r.ok) {
        const cfg = await r.json().catch(() => ({}));
        return cfg.claudeKey || '';
      }
      localStorage.removeItem(KEYS.GDRIVE_CONFIG);
    }
    const q  = encodeURIComponent("name='scratchypad_config.json' and trashed=false");
    const sr = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)`, {
      headers: { Authorization: `Bearer ${tok}` },
    });
    if (!sr.ok) return '';
    const found = await sr.json();
    if (found.files?.length) {
      const id = found.files[0].id;
      localStorage.setItem(KEYS.GDRIVE_CONFIG, id);
      const r = await fetch(`https://www.googleapis.com/drive/v3/files/${id}?alt=media`, {
        headers: { Authorization: `Bearer ${tok}` },
      });
      if (r.ok) { const cfg = await r.json().catch(() => ({})); return cfg.claudeKey || ''; }
    } else {
      await writeConfigFile(tok, '');
    }
    return '';
  };

  const ensureFolder = async tok => {
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

  const listFiles = async () => {
    const tok      = await getToken();
    const folderId = await ensureFolder(tok);
    const q        = encodeURIComponent(`'${folderId}' in parents and trashed=false`);
    const r        = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,modifiedTime)&orderBy=modifiedTime+desc`,
      { headers: { Authorization: `Bearer ${tok}` } },
    );
    if (!r.ok) throw new Error(`List failed ${r.status}`);
    const data = await r.json();
    return data.files || [];
  };

  const saveFile = async tab => {
    const tok      = await getToken();
    const folderId = await ensureFolder(tok);
    const q        = encodeURIComponent(`name='${tab.filename}' and '${folderId}' in parents and trashed=false`);
    const sr       = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)`, {
      headers: { Authorization: `Bearer ${tok}` },
    });
    if (!sr.ok) throw new Error(`Search failed ${sr.status}`);
    const found   = await sr.json();
    const content = new Blob([tab.text], { type: 'text/plain' });
    let savedId   = tab.fileId;
    if (found.files?.length) {
      savedId  = found.files[0].id;
      const ur = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${savedId}?uploadType=media`, {
        method: 'PATCH', headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'text/plain' }, body: content,
      });
      if (!ur.ok) throw new Error(`Update failed ${ur.status}`);
    } else {
      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify({ name: tab.filename, parents: [folderId] })], { type: 'application/json' }));
      form.append('file', content);
      const cr = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST', headers: { Authorization: `Bearer ${tok}` }, body: form,
      });
      if (!cr.ok) throw new Error(`Upload failed ${cr.status}`);
      savedId = (await cr.json()).id;
    }
    return savedId;
  };

  const downloadFile = async fileId => {
    const tok = await getToken();
    const r   = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: { Authorization: `Bearer ${tok}` },
    });
    if (!r.ok) throw new Error(`Download failed ${r.status}`);
    return r.text();
  };

  return { getToken, logout, loadConfig, writeConfigFile, listFiles, saveFile, downloadFile };
}
