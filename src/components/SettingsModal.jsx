import { Overlay, Modal, Field, Inp, Btn, Row } from '../ui';
import s from './SettingsModal.module.css';

const PROVIDERS = [
  { id: 'claude',     label: 'Claude',      sub: 'Anthropic',                  keyUrl: 'https://console.anthropic.com/settings/keys' },
  { id: 'openrouter', label: 'OpenRouter',  sub: 'multi-model · free tier',    keyUrl: 'https://openrouter.ai/settings/keys' },
  { id: 'groq',       label: 'Groq',        sub: 'fast inference · free tier', keyUrl: 'https://console.groq.com/keys' },
];

const A = ({ href, children }) => (
  <a href={href} target="_blank" rel="noreferrer" className={s.hintLink}>{children}</a>
);

export function SettingsModal({ config, onConfigChange, loading, onSave, onLogout, onClose }) {
  const set = (key, val) => onConfigChange({ ...config, [key]: val });

  return (
    <Overlay onClose={onClose}>
      <Modal title="Settings">

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

        <Row style={{ justifyContent: 'space-between' }}>
          <Btn onClick={onLogout} style={{ color: '#c46a6a', borderColor: '#e8c8c8' }}>Logout</Btn>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn onClick={onClose}>Cancel</Btn>
            <Btn accent onClick={onSave} disabled={loading}>{loading ? '…' : 'Save'}</Btn>
          </div>
        </Row>
      </Modal>
    </Overlay>
  );
}
