import { FONTS, STATUS_COLOR } from '../constants';
import { Btn } from './ui';
import s from './LoginScreen.module.css';

export function LoginScreen({ onLogin, loading, status }) {
  return (
    <div className={s.screen}>
      <style>{FONTS}</style>
      <img src={`${import.meta.env.BASE_URL}logo.png`} alt="ScratchyPad" className={s.logo} />
      <Btn accent onClick={onLogin} disabled={loading} style={{ padding: '8px 24px', fontSize: 13 }}>
        {loading ? '…' : 'Login with Google'}
      </Btn>
      {status.msg && (
        <span className={s.status} style={{ color: STATUS_COLOR[status.type] }}>{status.msg}</span>
      )}
    </div>
  );
}
