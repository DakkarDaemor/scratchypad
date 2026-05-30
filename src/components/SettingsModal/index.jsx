import { useState } from 'react';
import { Overlay, Modal, Field, Inp, Btn, Row } from '../../ui';
import s from './SettingsModal.module.css';

const PROVIDERS = [
  { id: 'claude',     label: 'Claude',      sub: 'Anthropic',                  keyUrl: 'https://console.anthropic.com/settings/keys' },
  { id: 'openai',     label: 'ChatGPT',     sub: 'OpenAI',                     keyUrl: 'https://platform.openai.com/api-keys' },
  { id: 'gemini',     label: 'Gemini',      sub: 'Google',                     keyUrl: 'https://aistudio.google.com/app/apikey' },
  { id: 'openrouter', label: 'OpenRouter',  sub: 'multi-model · free tier',    keyUrl: 'https://openrouter.ai/settings/keys' },
  { id: 'groq',       label: 'Groq',        sub: 'fast inference · free tier', keyUrl: 'https://console.groq.com/keys' },
];

const TABS = [
  { id: 'editor',  label: 'Editor' },
  { id: 'ai',      label: 'AI' },
  { id: 'actions', label: 'Actions' },
  { id: 'account', label: 'Account' },
];

const A = ({ href, children }) => (
  <a href={href} target="_blank" rel="noreferrer" className={s.hintLink}>{children}</a>
);

export function SettingsModal({ config, onConfigChange, loading, onSave, onLogout, onClose }) {
  const set = (key, val) => onConfigChange({ ...config, [key]: val });

  const [activeTab, setActiveTab] = useState('ai');
  const [newLabel,  setNewLabel]  = useState('');
  const [newPrompt, setNewPrompt] = useState('');
  const customActions = config.customActions || [];

  const addAction = () => {
    if (!newLabel.trim() || !newPrompt.trim()) return;
    set('customActions', [...customActions, { id: Date.now().toString(), label: newLabel.trim(), prompt: newPrompt.trim() }]);
    setNewLabel(''); setNewPrompt('');
  };
  const removeAction = id => set('customActions', customActions.filter(a => a.id !== id));

  return (
    <Overlay onClose={onClose}>
      <Modal title="Settings">

        <div className={s.tabBar}>
          {TABS.map(t => (
            <button
              key={t.id}
              className={`${s.tabBtn}${activeTab === t.id ? ` ${s.tabActive}` : ''}`}
              onClick={() => setActiveTab(t.id)}
            >{t.label}</button>
          ))}
        </div>

        {activeTab === 'editor' && (
          <div className={s.tabContent}>
            <Field label="Markdown preview">
              <label className={s.checkRow}>
                <input
                  type="checkbox"
                  checked={!!config.markdownMode}
                  onChange={e => set('markdownMode', e.target.checked)}
                  style={{ accentColor: '#8b6fcb' }}
                />
                <span>Abilita modalità Markdown</span>
                <span className={s.providerSub}>mostra pulsante Edit / Preview nell'editor</span>
              </label>
            </Field>
          </div>
        )}

        {activeTab === 'ai' && (
          <div className={s.tabContent}>
            <Field label="AI Provider">
              <div className={s.providers}>
                {PROVIDERS.map(p => (
                  <label key={p.id} className={`${s.providerRow}${config.provider === p.id ? ` ${s.selected}` : ''}`}>
                    <input
                      type="radio" name="provider" value={p.id}
                      checked={config.provider === p.id}
                      onChange={() => set('provider', p.id)}
                      style={{ accentColor: '#8b6fcb' }}
                    />
                    <span className={s.providerName}>{p.label}</span>
                    <span className={s.providerSub}>{p.sub}</span>
                    <a href={p.keyUrl} target="_blank" rel="noreferrer"
                      onClick={e => e.stopPropagation()} className={s.keyLink}>
                      get API key ↗
                    </a>
                  </label>
                ))}
              </div>
            </Field>

            {config.provider === 'claude' && (
              <Field label="Claude API Key" hint={<>saved to your Google Drive · <A href="https://console.anthropic.com/settings/keys">console.anthropic.com ↗</A></>}>
                <Inp type="password" value={config.claudeKey} onChange={e => set('claudeKey', e.target.value)} placeholder="sk-ant-…" />
              </Field>
            )}

            {config.provider === 'openai' && (<>
              <Field label="OpenAI API Key" hint={<><A href="https://platform.openai.com/api-keys">platform.openai.com ↗</A> · saved to your Google Drive</>}>
                <Inp type="password" value={config.openaiKey} onChange={e => set('openaiKey', e.target.value)} placeholder="sk-…" />
              </Field>
              <Field label="Model" hint={<><A href="https://platform.openai.com/docs/models">available models ↗</A></>}>
                <Inp value={config.openaiModel} onChange={e => set('openaiModel', e.target.value)} placeholder="gpt-4o-mini" />
              </Field>
            </>)}

            {config.provider === 'gemini' && (<>
              <Field label="Gemini API Key" hint={<><A href="https://aistudio.google.com/app/apikey">aistudio.google.com ↗</A> · saved to your Google Drive</>}>
                <Inp type="password" value={config.geminiKey} onChange={e => set('geminiKey', e.target.value)} placeholder="AIza…" />
              </Field>
              <Field label="Model" hint={<><A href="https://ai.google.dev/gemini-api/docs/models">available models ↗</A></>}>
                <Inp value={config.geminiModel} onChange={e => set('geminiModel', e.target.value)} placeholder="gemini-2.0-flash" />
              </Field>
            </>)}

            {config.provider === 'openrouter' && (<>
              <Field label="OpenRouter API Key" hint={<><A href="https://openrouter.ai/settings/keys">openrouter.ai ↗</A> · saved to your Google Drive</>}>
                <Inp type="password" value={config.openrouterKey} onChange={e => set('openrouterKey', e.target.value)} placeholder="sk-or-…" />
              </Field>
              <Field label="Model" hint={<><A href="https://openrouter.ai/models">browse models ↗</A> · append ":free" for free tier</>}>
                <Inp value={config.openrouterModel} onChange={e => set('openrouterModel', e.target.value)} placeholder="google/gemini-2.0-flash-exp:free" />
              </Field>
            </>)}

            {config.provider === 'groq' && (<>
              <Field label="Groq API Key" hint={<><A href="https://console.groq.com/keys">console.groq.com ↗</A> · free tier · saved to your Google Drive</>}>
                <Inp type="password" value={config.groqKey} onChange={e => set('groqKey', e.target.value)} placeholder="gsk_…" />
              </Field>
              <Field label="Model" hint={<><A href="https://console.groq.com/docs/models">available models ↗</A></>}>
                <Inp value={config.groqModel} onChange={e => set('groqModel', e.target.value)} placeholder="llama-3.3-70b-versatile" />
              </Field>
            </>)}

          </div>
        )}

        {activeTab === 'actions' && (
          <div className={s.tabContent}>
            <Field label="Custom AI Actions" hint={<>Use <code>{'{{text}}'}</code> as placeholder for the selected text</>}>
              {customActions.length > 0 && (
                <div className={s.customList}>
                  {customActions.map(a => (
                    <div key={a.id} className={s.customAction}>
                      <div className={s.customActionInfo}>
                        <span className={s.customActionLabel}>{a.label}</span>
                        <span className={s.customActionPrompt}>{a.prompt.length > 60 ? a.prompt.slice(0, 60) + '…' : a.prompt}</span>
                      </div>
                      <button className={s.customActionDel} onClick={() => removeAction(a.id)} title="Remove">×</button>
                    </div>
                  ))}
                </div>
              )}
              <div className={s.customForm}>
                <Inp value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="Nome (es. Traduci in spagnolo)" />
                <textarea
                  className={s.customTextarea}
                  value={newPrompt}
                  onChange={e => setNewPrompt(e.target.value)}
                  placeholder={'Prompt — usa {{text}} per il testo selezionato\n\nes. Traduci in spagnolo, mantenendo tono e stile:\n\n{{text}}'}
                  rows={4}
                />
                <Btn onClick={addAction} disabled={!newLabel.trim() || !newPrompt.trim()}>+ Add action</Btn>
              </div>
            </Field>
          </div>
        )}

        {activeTab === 'account' && (
          <div className={s.tabContent}>
            <Field label="Google Drive">
              <p className={s.accountNote}>
                La configurazione AI e i tuoi file sono salvati nella cartella <strong>/scratchypad/</strong> del tuo Google Drive.
              </p>
            </Field>
            <Field label="Sessione">
              <Btn onClick={onLogout} style={{ color: '#c46a6a', borderColor: '#e8c8c8' }}>Logout</Btn>
            </Field>
          </div>
        )}

        <Row style={{ justifyContent: 'flex-end' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn onClick={onClose}>Cancel</Btn>
            <Btn accent onClick={onSave} disabled={loading}>{loading ? '…' : 'Save'}</Btn>
          </div>
        </Row>
      </Modal>
    </Overlay>
  );
}
