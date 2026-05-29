import { Overlay, Modal, Btn, Row } from '../ui';
import s from './AIResultModal.module.css';

export function AIResultModal({ label, result, onDiscard, onNewTab, onApply }) {
  return (
    <Overlay onClose={onDiscard}>
      <Modal title={label} wide>
        <div className={s.result}>{result}</div>
        <Row>
          <Btn onClick={onDiscard}>Discard</Btn>
          <Btn onClick={onNewTab}>New tab</Btn>
          <Btn accent onClick={onApply}>Apply (replace)</Btn>
        </Row>
      </Modal>
    </Overlay>
  );
}
