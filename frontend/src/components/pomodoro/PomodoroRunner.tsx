import { useEffect, useRef } from 'react';
import { usePomodoroStore } from '../../store/pomodoroStore';
import { useCompletePomodoro } from '../../hooks/usePomodoro';

/**
 * The single heartbeat for the whole app.
 *
 * Mounted once, it ticks the store every second and logs the finished session
 * to the backend exactly once - `justFinished` is cleared straight after, so a
 * re-render (or a second timer component) cannot log it twice.
 */
const PomodoroRunner: React.FC = () => {
  const running = usePomodoroStore((state) => state.running);
  const justFinished = usePomodoroStore((state) => state.justFinished);
  const sessionId = usePomodoroStore((state) => state.sessionId);
  const tick = usePomodoroStore((state) => state.tick);
  const clearFinished = usePomodoroStore((state) => state.clearFinished);

  const { mutate: logSession } = useCompletePomodoro();
  // Guards against a double log if the effect re-runs before the mutation lands.
  const loggedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => tick(), 1000);
    return () => clearInterval(id);
  }, [running, tick]);

  useEffect(() => {
    if (!justFinished || !sessionId) return;
    if (loggedFor.current === sessionId) return;
    loggedFor.current = sessionId;

    logSession(sessionId);
    clearFinished();
  }, [justFinished, sessionId, logSession, clearFinished]);

  return null;
};

export default PomodoroRunner;