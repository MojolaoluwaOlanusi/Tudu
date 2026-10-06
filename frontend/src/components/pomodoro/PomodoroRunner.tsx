import { useEffect, useRef } from 'react';
import { usePomodoroStore, modeLabel } from '../../store/pomodoroStore';
import { useCompletePomodoro } from '../../hooks/usePomodoro';
import { useUiStore } from '../../store/uiStore';
import {
  buzz,
  playAlarm,
  restoreFinishTitle,
  showFinishNotification,
  showFinishTitle,
} from '../../lib/pomodoroAlerts';

/**
 * The single heartbeat for the whole app.
 *
 * Mounted once, it ticks the store every second and logs the finished session
 * to the backend exactly once - `justFinished` is cleared straight after, so a
 * re-render (or a second timer component) cannot log it twice.
 *
 * Background tabs throttle `setInterval`, so the store counts down against an
 * absolute `endsAt` timestamp (see `pomodoroStore`) and this component also:
 * - fires a single timeout aimed at the end instant, so the finish alert lands
 *   on time even when the per-second interval is throttled away, and
 * - resyncs on `visibilitychange`/`focus`, so returning to the tab corrects the
 *   clock (and raises any overdue alert) in one tick.
 *
 * When the countdown reaches zero it raises every finish alert: alarm (unless
 * muted), desktop notification, tab-title hint, vibration and a toast.
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

    // One-shot aimed at the end instant. A lone long timeout survives
    // background-tab throttling far better than a self-repeating interval.
    const { endsAt, remaining } = usePomodoroStore.getState();
    const target = endsAt ?? Date.now() + remaining * 1000;
    // +50ms so the deadline has definitely passed when the tick lands.
    const endId = setTimeout(() => tick(), Math.max(0, target - Date.now()) + 50);

    // A hidden tab can suspend timers outright; one tick on return is all the
    // wall-clock countdown needs to be correct again (and to alert if the
    // session ended while the user was away).
    const resync = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', resync);
    window.addEventListener('focus', resync);

    return () => {
      clearInterval(id);
      clearTimeout(endId);
      document.removeEventListener('visibilitychange', resync);
      window.removeEventListener('focus', resync);
    };
  }, [running, tick]);

  useEffect(() => {
    if (!justFinished || !sessionId) return;
    if (loggedFor.current === sessionId) return;
    loggedFor.current = sessionId;

    logSession(sessionId);
    clearFinished();
  }, [justFinished, sessionId, logSession, clearFinished]);

  // Finish alerts. `justFinished` is cleared straight away by the log effect
  // above, so this fires once per finish; reading the rest of the store inside
  // the effect keeps only `justFinished` as the trigger (toggling mute
  // mid-finish cannot replay it).
  useEffect(() => {
    if (!justFinished) return;

    const state = usePomodoroStore.getState();
    showFinishTitle();
    if (state.soundEnabled) playAlarm();
    buzz();
    showFinishNotification(
      state.taskTitle
        ? `${modeLabel(state.mode)} session for "${state.taskTitle}" is complete.`
        : `${modeLabel(state.mode)} session complete. Time for a break!`
    );
    useUiStore.getState().pushToast('Pomodoro finished - time for a break!', 'success');
  }, [justFinished]);

  // The "Time's up!" tab title stays up for the whole finished state (manual
  // log or discard), and only goes back to normal once the session is cleared.
  useEffect(() => {
    if (sessionId === null) restoreFinishTitle();
  }, [sessionId]);

  return null;
};

export default PomodoroRunner;