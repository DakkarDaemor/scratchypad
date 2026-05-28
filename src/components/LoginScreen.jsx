import { FONTS } from '../constants';
import { Btn } from './ui';

const STATUS_COLOR = { ok: '#7a9f6a', err: '#c46a6a', warn: '#9b85c4', info: '#9b85c4' };

export function LoginScreen({ onLogin, loading, status }) {
  return (
    <div style={{
      fontFamily: "'DM Sans', sans-serif",
      background: '#f7f6f4', height: '100vh',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 20,
    }}>
      <style>{FONTS}</style>
      <div style={{ fontSize: 20, fontWeight: 500, color: '#9b85c4', letterSpacing: '0.02em' }}>
        ScratchyPad
      </div>
      <Btn accent onClick={onLogin} disabled={loading} style={{ padding: '8px 24px', fontSize: 13 }}>
        {loading ? '…' : 'Login with Google'}
      </Btn>
      {status.msg && (
        <span style={{ fontSize: 11, color: STATUS_COLOR[status.type] }}>{status.msg}</span>
      )}
    </div>
  );
}
