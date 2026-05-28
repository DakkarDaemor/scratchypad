import { AI_ACTIONS } from '../constants';

export function AIBar({ loading, wordCount, charCount, onAction }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
      padding: '8px 12px', borderTop: '1px solid #e5e0de',
      background: '#f3f2f0', flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
        <span style={{ fontSize: 9, color: '#c0b8cc', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          AI
        </span>
        {AI_ACTIONS.map(a => (
          <button
            key={a}
            disabled={loading}
            onClick={() => onAction(a)}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#9b85c4'; e.currentTarget.style.color = '#9b85c4'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#ddd8e8'; e.currentTarget.style.color = '#8a8098'; }}
            style={{
              background: 'transparent', border: '1px solid #ddd8e8',
              color: '#8a8098', padding: '3px 10px', fontSize: 11,
              cursor: 'pointer', borderRadius: 3,
              fontFamily: "'DM Sans', sans-serif", transition: 'border-color 0.15s, color 0.15s',
            }}
          >{a}</button>
        ))}
      </div>
      <span style={{ fontSize: 10, color: '#c5bfd0' }}>{wordCount} w · {charCount} ch</span>
    </div>
  );
}
