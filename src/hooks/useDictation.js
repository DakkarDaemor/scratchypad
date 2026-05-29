import { useState, useRef, useEffect, useCallback } from 'react';

export function useDictation(onInsert) {
  const [active, setActive] = useState(false);
  const recogRef            = useRef(null);
  const onInsertRef         = useRef(onInsert);

  useEffect(() => { onInsertRef.current = onInsert; }, [onInsert]);

  const supported = !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  const stop = useCallback(() => {
    recogRef.current?.stop();
    recogRef.current = null;
    setActive(false);
  }, []);

  const start = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    r.continuous      = true;
    r.interimResults  = false;
    r.onresult = e => {
      const transcript = Array.from(e.results)
        .slice(e.resultIndex)
        .filter(res => res.isFinal)
        .map(res => res[0].transcript)
        .join('');
      if (transcript) onInsertRef.current(transcript);
    };
    r.onerror = e => { if (e.error !== 'no-speech') stop(); };
    r.onend   = () => setActive(false);
    recogRef.current = r;
    r.start();
    setActive(true);
  }, [stop]);

  const toggle = useCallback(() => { active ? stop() : start(); }, [active, start, stop]);

  useEffect(() => () => recogRef.current?.stop(), []);

  return { active, toggle, supported };
}
