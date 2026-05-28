import { Overlay, Modal, Field, Inp, Btn, Row } from './ui';

export function SettingsModal({ apiKey, onChange, loading, onSave, onLogout, onClose }) {
  return (
    <Overlay onClose={onClose}>
      <Modal title="Settings">
        <Field label="Claude API Key" hint="console.anthropic.com — saved to your Google Drive">
          <Inp type="password" value={apiKey} onChange={e => onChange(e.target.value)} placeholder="sk-ant-…" />
        </Field>
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
