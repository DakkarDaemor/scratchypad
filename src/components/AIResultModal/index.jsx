import { marked } from 'marked';
import { Overlay, Modal, Btn, Row } from '../../ui';
import s from './AIResultModal.module.css';

marked.use({ breaks: true, gfm: true });

export function AIResultModal({ label, result, onDiscard, onNewTab, onApply }) {
  return (
    <Overlay onClose={onDiscard}>
      <Modal title={label} wide>
        <div className={s.result} dangerouslySetInnerHTML={{ __html: marked.parse(result || '') }} />
        <Row>
          <Btn onClick={onDiscard}>Discard</Btn>
          <Btn onClick={onNewTab}>New tab</Btn>
          <Btn accent onClick={onApply}>Apply (replace)</Btn>
        </Row>
      </Modal>
    </Overlay>
  );
}
