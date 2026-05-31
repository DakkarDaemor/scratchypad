import { useState, useRef } from 'react';
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

export function AIBar({
  loading, wordCount, charCount, onAction, aiConfigured,
  onOpenSettings, status, dictationMode, dictating,
  onDictStart, onDictStop,
  customActions = [], hiddenActions = [], onHiddenActionsChange,
}) {

  const [configMode, setConfigMode] = useState(false);
  const touchStartY = useRef(null);

  const allActions = [
    ...AI_ACTIONS.map(a => ({ id: a, label: a })),
    ...customActions,
  ];
  const visibleBuiltin = AI_ACTIONS.filter(a => !hiddenActions.includes(a));
  const visibleCustom  = customActions.filter(a => !hiddenActions.includes(a.id));

  const toggle = id => {
    const next = hiddenActions.includes(id)
      ? hiddenActions.filter(x => x !== id)
      : [...hiddenActions, id];
    onHiddenActionsChange(next);
  };

  const onTouchStart = e => { touchStartY.current = e.touches[0].clientY; };
  const onTouchEnd   = e => {
    if (touchStartY.current === null) return;
    const dy = touchStartY.current - e.changedTouches[0].clientY;
    if (dy > 40)  setConfigMode(true);
    if (dy < -40) setConfigMode(false);
    touchStartY.current = null;
  };

  return (
    <div className={s.bar} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>

      {configMode && (
        <div className={s.configPanel}>
          <div className={s.configHeader}>
            <span className={s.configTitle}>Azioni visibili</span>
            <button className={s.configClose} onClick={() => setConfigMode(false)}>✕</button>
          </div>
          <div className={s.configList}>
            {allActions.map(a => (
              <label key={a.id} className={s.configRow}>
                <input
                  type="checkbox"
                  checked={!hiddenActions.includes(a.id)}
                  onChange={() => toggle(a.id)}
                  style={{ accentColor: '#8b6fcb' }}
                />
                <span className={s.configRowLabel}>{a.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {dictationMode
        ? <DictaphoneBtn dictating={dictating} onStart={onDictStart} onStop={onDictStop} />
        : <div className={s.actions}>
            <span className={s.label}>AI</span>
            {aiConfigured
              ? <>
                  {visibleBuiltin.map(a => (
                    <button key={a} disabled={loading} onClick={() => onAction(a)} className={s.action}>{a}</button>
                  ))}
                  {visibleCustom.length > 0 && visibleBuiltin.length > 0 && <span className={s.actionSep}>|</span>}
                  {visibleCustom.map(a => (
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

      <div className={s.footer}>
        <span className={s.count}>{wordCount} w · {charCount} ch</span>
        {!dictationMode && aiConfigured && (
          <button
            className={`${s.configBtn}${configMode ? ` ${s.configBtnOn}` : ''}`}
            onClick={() => setConfigMode(m => !m)}
            title={configMode ? 'Chiudi' : 'Azioni visibili'}
          >✎</button>
        )}
      </div>

      {status?.msg && (
        <div className={s.statusOverlay} style={{ color: STATUS_COLOR[status.type] }}>
          {status.msg}
        </div>
      )}
    </div>
  );
}
