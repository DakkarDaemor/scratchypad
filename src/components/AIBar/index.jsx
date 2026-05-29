import { AI_ACTIONS } from '../../constants';
import s from './AIBar.module.css';

export function AIBar({ loading, wordCount, charCount, onAction, aiConfigured, onOpenSettings }) {
  return (
    <div className={s.bar}>
      <div className={s.actions}>
        <span className={s.label}>AI</span>
        {aiConfigured
          ? AI_ACTIONS.map(a => (
              <button key={a} disabled={loading} onClick={() => onAction(a)} className={s.action}>{a}</button>
            ))
          : <span className={s.unconfigured}>
              non configurata —{' '}
              <button onClick={onOpenSettings} className={s.settingsLink}>impostazioni</button>
            </span>
        }
      </div>
      <span className={s.count}>{wordCount} w · {charCount} ch</span>
    </div>
  );
}
