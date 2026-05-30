import { AI_ACTIONS, STATUS_COLOR } from '../../constants';
import s from './AIBar.module.css';

function DictaphoneBtn({ dictating, onStart, onStop }) {
  return (
    <button
      className={`${s.pttBtn}${dictating ? ` ${s.pttActive}` : ''}`}
      onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); onStart(); }}
      onPointerUp={onStop}
      onPointerCancel={onStop}
    >
      <span className={s.pttIcon}>🎤</span>
      <span className={s.pttLabel}>{dictating ? 'Dettatura in corso…' : 'Tieni premuto per dettare'}</span>
    </button>
  );
}

export function AIBar({ loading, wordCount, charCount, onAction, aiConfigured, onOpenSettings, status, dictationMode, dictating, onDictStart, onDictStop, customActions = [] }) {
  return (
    <div className={s.bar}>
      {dictationMode
        ? <DictaphoneBtn dictating={dictating} onStart={onDictStart} onStop={onDictStop} />
        : <div className={s.actions}>
            <span className={s.label}>AI</span>
            {aiConfigured
              ? <>
                  {AI_ACTIONS.map(a => (
                    <button key={a} disabled={loading} onClick={() => onAction(a)} className={s.action}>{a}</button>
                  ))}
                  {customActions.length > 0 && <span className={s.actionSep}>|</span>}
                  {customActions.map(a => (
                    <button key={a.id} disabled={loading} onClick={() => onAction(a)} className={s.action}>{a.label}</button>
                  ))}
                </>
              : <span className={s.unconfigured}>
                  non configurata —{' '}
                  <button onClick={onOpenSettings} className={s.settingsLink}>impostazioni</button>
                </span>
            }
          </div>
      }
      <span className={s.count}>{wordCount} w · {charCount} ch</span>
      {status?.msg && (
        <div className={s.statusOverlay} style={{ color: STATUS_COLOR[status.type] }}>
          {status.msg}
        </div>
      )}
    </div>
  );
}
