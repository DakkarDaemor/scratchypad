import { useState } from 'react';
import { mkTab } from '../utils';

export function useAIActions({ ai, session, leftTaRef, rightTaRef, flash, clearStatus, setLoading, setPanel }) {
  const [aiResult, setAiResult] = useState('');
  const [aiLabel,  setAiLabel]  = useState('');
  const [aiAppend, setAiAppend] = useState(false);

  const getSelected = () => {
    const ref = session.focusedPane === 'left' ? leftTaRef : rightTaRef;
    const tab = session.getTab(session.focusedId);
    const t   = tab?.text || '';
    const ta  = ref.current;
    if (!ta) return t;
    const sel = ta.value.substring(ta.selectionStart, ta.selectionEnd);
    return sel.trim() ? sel : t;
  };

  const runAI = async action => {
    const content = getSelected();
    if (!content.trim()) { flash('Nothing to process', 'warn'); return; }
    const label = typeof action === 'string' ? action : action.label;
    setLoading(true); setAiLabel(label);
    setAiAppend((typeof action === 'string' && action === 'Continue') || (typeof action === 'object' && !!action.append));
    flash(`Running "${label}"…`, 'info', true);
    try {
      let result;
      if (typeof action === 'string') {
        result = await ai.run(action, content);
      } else {
        const prompt = action.prompt.includes('{{text}}')
          ? action.prompt.replace(/\{\{text\}\}/g, content)
          : action.prompt + '\n\n' + content;
        result = await ai.runPrompt(prompt);
      }
      setAiResult(result); setPanel('result');
      clearStatus();
    } catch (e) { flash(`AI error: ${e.message}`, 'err'); }
    setLoading(false);
  };

  const applyResult = () => {
    const tab = session.getTab(session.focusedId);
    if (!tab) return;
    const ta = (session.focusedPane === 'left' ? leftTaRef : rightTaRef).current;
    let newText;
    if (aiAppend) {
      const insertPos = ta && ta.selectionStart !== ta.selectionEnd ? ta.selectionEnd : tab.text.length;
      const sep = tab.text.length > 0 && !tab.text.endsWith('\n') ? '\n' : '';
      newText = tab.text.substring(0, insertPos) + sep + aiResult + tab.text.substring(insertPos);
    } else {
      newText = aiResult;
      if (ta) {
        const { selectionStart: ss, selectionEnd: se } = ta;
        if (ss !== se) newText = tab.text.substring(0, ss) + aiResult + tab.text.substring(se);
      }
    }
    session.updateTab(session.focusedId, { text: newText, dirty: true });
    setPanel(null); setAiResult('');
  };

  const applyResultNewTab = () => {
    const base = session.getTab(session.focusedId)?.filename || 'scratch.md';
    const tab  = mkTab(session.getNextFilename(base), aiResult, null);
    session.openInTab(tab.filename, tab.text, null);
    setPanel(null); setAiResult('');
  };

  return { aiResult, aiLabel, aiAppend, runAI, applyResult, applyResultNewTab, setAiResult };
}
