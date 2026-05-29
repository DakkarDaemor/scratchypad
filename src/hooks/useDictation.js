import { useState, useRef, useEffect, useCallback } from 'react';

export function useDictation(onInsert) {
  const [active, setActive]  = useState(false);
  const recogRef             = useRef(null);
  const onInsertRef          = useRef(onInsert);
  const stoppedRef           = useRef(false);

  useEffect(() => { onInsertRef.current = onInsert; }, [onInsert]);

  const supported = !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  const stop = useCallback(() => {
    stoppedRef.current = true;
    recogRef.current?.stop();
    recogRef.current = null;
    setActive(false);
  }, []);

  const start = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    stoppedRef.current = false;

    const makeSession = () => {
      const r = new SR();
      r.continuous     = true;
      r.interimResults = false;
      r.onresult = e => {
        const transcript = Array.from(e.results)
          .slice(e.resultIndex)
          .filter(res => res.isFinal)
          .map(res => res[0].transcript)
          .join('');
        if (transcript) onInsertRef.current(transcript);
      };
      r.onerror = e => { if (e.error !== 'no-speech') stop(); };
      r.onend = () => {
        if (stoppedRef.current) { setActive(false); return; }
        // browser ha tagliato la sessione (timeout) — riavvia
        setTimeout(() => {
          if (stoppedRef.current) { setActive(false); return; }
          const next = makeSession();
          recogRef.current = next;
          next.start();
        }, 150);
      };
      return r;
    };

    const r = makeSession();
    recogRef.current = r;
    r.start();
    setActive(true);
  }, [stop]);

  useEffect(() => () => { stoppedRef.current = true; recogRef.current?.stop(); }, []);

  return { active, start, stop, supported };
}
