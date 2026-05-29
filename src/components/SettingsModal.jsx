import { Overlay, Modal, Field, Inp, Btn, Row } from './ui';

const PROVIDERS = [
  { id: 'claude',     label: 'Claude',      sub: 'Anthropic — console.anthropic.com' },
  { id: 'openrouter', label: 'OpenRouter',  sub: 'Multi-model — free models available' },
  { id: 'groq',       label: 'Groq',        sub: 'Fast inference — free tier, console.groq.com' },
];

export function SettingsModal({ config, onConfigChange, loading, onSave, onLogout, onClose }) {
  const set = (key, val) => onConfigChange({ ...config, [key]: val });

  return (
    <Overlay onClose={onClose}>
      <Modal title="Settings">

        <Field label="AI Provider">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {PROVIDERS.map(p => (
              <label key={p.id} style={{
                display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                padding: '6px 10px', borderRadius: 6,
                background: config.provider === p.id ? '#f0edf8' : 'transparent',
                border: `1px solid ${config.provider === p.id ? '#c4b5e8' : 'transparent'}`,
              }}>
                <input
                  type="radio"
                  name="provider"
                  value={p.id}
                  checked={config.provider === p.id}
                  onChange={() => set('provider', p.id)}
                  style={{ accentColor: '#8b6fcb' }}
                />
                <span style={{ fontWeight: 500, fontSize: 14 }}>{p.label}</span>
                <span style={{ color: '#8a8480', fontSize: 12 }}>{p.sub}</span>
              </label>
            ))}
          </div>
        </Field>

        {config.provider === 'claude' && (
          <Field label="Claude API Key" hint="saved to your Google Drive">
            <Inp
              type="password"
              value={config.claudeKey}
              onChange={e => set('claudeKey', e.target.value)}
              placeholder="sk-ant-…"
            />
          </Field>
        )}

        {config.provider === 'openrouter' && (
          <>
            <Field label="OpenRouter API Key" hint="openrouter.ai — saved to your Google Drive">
              <Inp
                type="password"
                value={config.openrouterKey}
                onChange={e => set('openrouterKey', e.target.value)}
                placeholder="sk-or-…"
              />
            </Field>
            <Field label="Model" hint='openrouter.ai/models — append ":free" for free tier'>
              <Inp
                value={config.openrouterModel}
                onChange={e => set('openrouterModel', e.target.value)}
                placeholder="google/gemini-2.0-flash-exp:free"
              />
            </Field>
          </>
        )}

        {config.provider === 'groq' && (
          <>
            <Field label="Groq API Key" hint="console.groq.com — free tier, saved to your Google Drive">
              <Inp
                type="password"
                value={config.groqKey}
                onChange={e => set('groqKey', e.target.value)}
                placeholder="gsk_…"
              />
            </Field>
            <Field label="Model" hint="console.groq.com/docs/models">
              <Inp
                value={config.groqModel}
                onChange={e => set('groqModel', e.target.value)}
                placeholder="llama-3.3-70b-versatile"
              />
            </Field>
          </>
        )}

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
