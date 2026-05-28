import { Overlay, Modal, Btn, Row } from './ui';

export function AIResultModal({ label, result, onDiscard, onNewTab, onApply }) {
  return (
    <Overlay onClose={onDiscard}>
      <Modal title={label} wide>
        <div style={{
          background: '#f0edf8', border: '1px solid #dbd5e8', borderRadius: 4,
          padding: '16px 18px', fontSize: 14, lineHeight: 1.75, color: '#363240',
          fontFamily: "'Lora', Georgia, serif", whiteSpace: 'pre-wrap',
          overflowY: 'auto', maxHeight: '52vh', marginBottom: 16,
        }}>
          {result}
        </div>
        <Row>
          <Btn onClick={onDiscard}>Discard</Btn>
          <Btn onClick={onNewTab}>New tab</Btn>
          <Btn accent onClick={onApply}>Apply (replace)</Btn>
        </Row>
      </Modal>
    </Overlay>
  );
}
