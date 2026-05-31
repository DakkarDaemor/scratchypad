import { Overlay, Modal, Btn, Row } from '../../ui';

export function AppDialogs({
  deleteConfirm, onCancelDelete, onConfirmDelete,
  closeTabConfirm, onCancelCloseTab, onConfirmCloseTab,
  restoreConfirm, onCancelRestore, onConfirmRestore,
  errorDialog, onCloseError,
  loading,
}) {
  return (
    <>
      {deleteConfirm && (
        <Overlay onClose={onCancelDelete} zIndex={300}>
          <Modal title="Delete file">
            <p style={{ fontSize: 13, color: '#5a5570', lineHeight: 1.6, marginBottom: 20 }}>
              Delete <strong>{deleteConfirm.name}</strong>? This cannot be undone.
            </p>
            <Row>
              <Btn onClick={onCancelDelete}>Cancel</Btn>
              <Btn onClick={onConfirmDelete} disabled={loading}
                style={{ background: '#c46a6a', borderColor: '#c46a6a', color: '#fff' }}>
                {loading ? '…' : 'Delete'}
              </Btn>
            </Row>
          </Modal>
        </Overlay>
      )}

      {closeTabConfirm && (
        <Overlay onClose={onCancelCloseTab} zIndex={300}>
          <Modal title="Modifiche non salvate">
            <p style={{ fontSize: 13, color: '#5a5570', lineHeight: 1.6, marginBottom: 20 }}>
              La tab <strong>{closeTabConfirm.filename}</strong> ha modifiche non salvate.<br />
              Chiudere senza salvare?
            </p>
            <Row>
              <Btn onClick={onCancelCloseTab}>Annulla</Btn>
              <Btn onClick={onConfirmCloseTab}
                style={{ background: '#c46a6a', borderColor: '#c46a6a', color: '#fff' }}>
                Chiudi senza salvare
              </Btn>
            </Row>
          </Modal>
        </Overlay>
      )}

      {restoreConfirm && (
        <Overlay onClose={onCancelRestore} zIndex={300}>
          <Modal title="Ripristina backup">
            <p style={{ fontSize: 13, color: '#5a5570', lineHeight: 1.6, marginBottom: 20 }}>
              Ripristinare <strong>{restoreConfirm.bakName}</strong> su <strong>{restoreConfirm.originalName}</strong>?<br />
              Il contenuto attuale del file verrà sovrascritto.
            </p>
            <Row>
              <Btn onClick={onCancelRestore}>Annulla</Btn>
              <Btn onClick={onConfirmRestore} disabled={loading}
                style={{ background: '#7b6bb0', borderColor: '#7b6bb0', color: '#fff' }}>
                {loading ? '…' : 'Ripristina'}
              </Btn>
            </Row>
          </Modal>
        </Overlay>
      )}

      {errorDialog && (
        <Overlay onClose={onCloseError} zIndex={300}>
          <Modal title="Errore">
            <p style={{ fontSize: 13, color: '#5a5570', lineHeight: 1.6, marginBottom: 20, whiteSpace: 'pre-wrap' }}>
              {errorDialog}
            </p>
            <Row>
              <Btn accent onClick={onCloseError}>OK</Btn>
            </Row>
          </Modal>
        </Overlay>
      )}
    </>
  );
}
