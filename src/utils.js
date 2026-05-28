import { KEYS } from './constants';

export const mkTab = (filename = 'scratch.txt', text = '', fileId = null) => ({
  id: `t${Date.now()}${Math.random().toString(36).slice(2, 5)}`,
  filename,
  text,
  fileId,
  dirty: false,
});

export const initSession = (() => {
  try {
    const s = JSON.parse(localStorage.getItem(KEYS.SESSION));
    if (Array.isArray(s?.tabs) && s.tabs.length > 0) return s;
  } catch {}
  const t = mkTab();
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
