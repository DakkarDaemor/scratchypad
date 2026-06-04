import { KEYS } from './constants';

export const readSnippetIndex = () => {
  try { return JSON.parse(localStorage.getItem(KEYS.SNIPPET_INDEX) || '{}'); } catch { return {}; }
};

export const writeSnippet = (fileId, text) => {
  if (!fileId) return;
  const idx = readSnippetIndex();
  idx[fileId] = text.replace(/\s+/g, ' ').trim().slice(0, 80);
  localStorage.setItem(KEYS.SNIPPET_INDEX, JSON.stringify(idx));
};

export const mkTab = (filename = 'scratch.md', text = '', fileId = null) => ({
  id: `t${Date.now()}${Math.random().toString(36).slice(2, 5)}`,
  filename,
  text,
  fileId,
  dirty: false,
  color: null,
});

export const initSession = (() => {
  try {
    const s = JSON.parse(localStorage.getItem(KEYS.SESSION));
    if (Array.isArray(s?.tabs) && s.tabs.length > 0) return s;
  } catch {}
  const t = mkTab();
  if (window.innerWidth >= 1200) {
    const t2 = mkTab('scratch_2.md');
    return { tabs: [t, t2], leftTabId: t.id, rightTabId: t2.id };
  }
  return { tabs: [t], leftTabId: t.id, rightTabId: null };
})();

export const nextFilename = (base, takenNames) => {
  const dot  = base.lastIndexOf('.');
  const stem = dot > 0 ? base.slice(0, dot) : base;
  const ext  = dot > 0 ? base.slice(dot) : '';
  for (let i = 2; i < 100; i++) {
    const c = `${stem}_${i}${ext}`;
    if (!takenNames.has(c)) return c;
  }
  return `${stem}_new${ext}`;
};
