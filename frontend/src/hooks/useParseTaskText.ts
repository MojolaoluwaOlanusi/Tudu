import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { nlpService } from '../services/nlpService';
import { ParsedTaskText } from '../types/nlp';

/** Wait this long after the last keystroke before asking the server. */
const DEBOUNCE_MS = 300;

/** Below this, there is nothing worth parsing. */
const MIN_CHARS = 3;

/**
 * Live preview of how a natural-language sentence will be interpreted.
 *
 * Debounced so typing does not fire a request per keystroke, and guarded by a
 * request id so a slow response can never overwrite a newer one.
 */
export const useParseTaskText = (text: string) => {
  const token = useAuthStore((state) => state.token);
  const [result, setResult] = useState<ParsedTaskText | null>(null);
  const [isParsing, setIsParsing] = useState(false);

  const requestId = useRef(0);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    const trimmed = text.trim();

    if (!token || trimmed.length < MIN_CHARS) {
      setResult(null);
      setIsParsing(false);
      return;
    }

    const id = ++requestId.current;
    setIsParsing(true);

    const timer = setTimeout(async () => {
      try {
        const parsed = await nlpService.parseTaskText(token, trimmed);
        if (isMounted.current && id === requestId.current) setResult(parsed);
      } catch {
        // A failed preview must never block typing.
        if (isMounted.current && id === requestId.current) setResult(null);
      } finally {
        if (isMounted.current && id === requestId.current) setIsParsing(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [text, token]);

  return { result, isParsing };
};