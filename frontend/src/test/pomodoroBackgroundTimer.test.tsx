// Regression guard for issue #23: "Pomodoro timer pauses when tab is inactive
// and no alarm/notification when timer ends".
//
// The countdown must follow the wall clock - a throttled background tab misses
// ticks, so decrementing once per tick falls behind - and hitting zero must
// raise the finish alerts (alarm, desktop notification, tab title, toast).
import { act, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import PomodoroRunner from '../components/pomodoro/PomodoroRunner';
import StartPomodoroButton from '../components/pomodoro/StartPomodoroButton';
import { usePomodoroStore } from '../store/pomodoroStore';
import { useUiStore } from '../store/uiStore';
import { playAlarm, restoreFinishTitle } from '../lib/pomodoroAlerts';

// The runner's auto-log and the start button go through these hooks; neither
// should reach react-query or the network in this suite.
vi.mock('../hooks/usePomodoro', () => ({
  useCompletePomodoro: () => ({ mutate: vi.fn() }),
  useStartPomodoro: () => ({ mutate: vi.fn(), isPending: false }),
}));

// Spy on the alarm while keeping the real title/notification/permission code.
vi.mock('../lib/pomodoroAlerts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/pomodoroAlerts')>();
  return { ...actual, playAlarm: vi.fn() };
});

/** Minimal Notification stand-in - jsdom ships no implementation. */
class FakeNotification {
  static permission: NotificationPermission = 'default';
  static requestPermission = vi.fn(
    async (): Promise<NotificationPermission> => 'granted'
  );
  static instances: FakeNotification[] = [];
  static reset() {
    FakeNotification.permission = 'default';
    FakeNotification.requestPermission.mockClear();
    FakeNotification.instances = [];
  }

  title: string;
  options?: NotificationOptions;
  onclick: ((this: Notification, ev: Event) => unknown) | null = null;
  close = vi.fn();

  constructor(title: string, options?: NotificationOptions) {
    this.title = title;
    this.options = options;
    FakeNotification.instances.push(this);
  }
}

// Snapshot of the freshly-created store, restored before every test.
const INITIAL_STATE = { ...usePomodoroStore.getState() };

const START_TIME = new Date('2026-01-01T09:00:00.000Z');

const startSession = (durationMinutes = 25) =>
  usePomodoroStore.getState().begin({
    sessionId: 'session-1',
    taskId: null,
    taskTitle: 'Write the report',
    mode: 'focus',
    durationMinutes,
  });

describe('pomodoro background timer and finish alerts (#23)', () => {
  beforeEach(() => {
    restoreFinishTitle();
    document.title = 'Tudu';
    FakeNotification.reset();
    vi.stubGlobal('Notification', FakeNotification);
    usePomodoroStore.setState(INITIAL_STATE);
    useUiStore.setState({ toasts: [] });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  describe('wall-clock countdown', () => {
    beforeEach(() => {
      // Fake Date alongside the timers so "time passed without a tick" is
      // expressible without actually firing the interval.
      vi.useFakeTimers({
        toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'],
      });
      vi.setSystemTime(START_TIME);
    });

    it('catches up with wall-clock time after ticks are throttled away', () => {
      startSession(25);

      // Ten minutes in a hidden tab: not a single interval tick fired.
      vi.setSystemTime(Date.now() + 10 * 60_000);
      usePomodoroStore.getState().tick();

      expect(usePomodoroStore.getState().remaining).toBe(15 * 60);
    });

    it('finishes at the deadline even when no tick fired in between', () => {
      startSession(25);

      // 26 minutes pass without any tick - the old per-second decrement would
      // still show 24:59 here.
      vi.setSystemTime(Date.now() + 26 * 60_000);
      usePomodoroStore.getState().tick();

      const state = usePomodoroStore.getState();
      expect(state.remaining).toBe(0);
      expect(state.running).toBe(false);
      expect(state.endsAt).toBeNull();

      // A later tick cannot re-fire the finish.
      usePomodoroStore.getState().tick();
      expect(usePomodoroStore.getState().remaining).toBe(0);
    });

    it('pause freezes the clock and resume re-anchors it', () => {
      startSession(25);

      vi.setSystemTime(Date.now() + 5 * 60_000);
      usePomodoroStore.getState().pause();

      let state = usePomodoroStore.getState();
      expect(state.remaining).toBe(20 * 60);
      expect(state.running).toBe(false);
      expect(state.endsAt).toBeNull();

      // An hour away from the desk must not eat into the paused session.
      vi.setSystemTime(Date.now() + 60 * 60_000);
      usePomodoroStore.getState().resume();

      state = usePomodoroStore.getState();
      expect(state.running).toBe(true);
      expect(state.endsAt).toBe(Date.now() + 20 * 60 * 1000);

      vi.setSystemTime(Date.now() + 60_000);
      usePomodoroStore.getState().tick();
      expect(usePomodoroStore.getState().remaining).toBe(19 * 60);
    });

    it('anchors a session persisted without an end timestamp (pre-fix storage)', () => {
      // What localStorage holds for users who never reloaded since the fix.
      usePomodoroStore.setState({
        sessionId: 'legacy-session',
        running: true,
        endsAt: null,
        remaining: 600,
        justFinished: false,
      });

      usePomodoroStore.getState().tick();
      expect(usePomodoroStore.getState().endsAt).toBe(Date.now() + 600_000);

      // ...and from the anchor on, the wall clock wins.
      vi.setSystemTime(Date.now() + 120_000);
      usePomodoroStore.getState().tick();
      expect(usePomodoroStore.getState().remaining).toBe(480);
    });
  });

  describe('finish alerts', () => {
    beforeEach(() => {
      vi.useFakeTimers({
        toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'],
      });
      vi.setSystemTime(START_TIME);
      FakeNotification.permission = 'granted';
    });

    it('resyncs when the tab returns and raises alarm, notification, title and toast', () => {
      startSession(25);
      render(<PomodoroRunner />);

      // 26 minutes hidden: the interval never ran, then the user comes back.
      vi.setSystemTime(Date.now() + 26 * 60_000);
      act(() => {
        document.dispatchEvent(new Event('visibilitychange'));
      });

      const state = usePomodoroStore.getState();
      expect(state.remaining).toBe(0);
      expect(state.running).toBe(false);

      expect(vi.mocked(playAlarm)).toHaveBeenCalledTimes(1);
      expect(FakeNotification.instances).toHaveLength(1);
      expect(FakeNotification.instances[0].title).toContain("Time's up");
      expect(FakeNotification.instances[0].options?.tag).toBe('pomodoro-finished');
      expect(document.title).toContain("Time's up");
      expect(useUiStore.getState().toasts).toHaveLength(1);

      // The tab title stays up until the session is cleared, then goes back.
      act(() => {
        usePomodoroStore.getState().abandon();
      });
      expect(document.title).toBe('Tudu');
    });

    it('stays silent when the alarm is muted but still notifies', () => {
      usePomodoroStore.setState({ soundEnabled: false });
      startSession(25);
      render(<PomodoroRunner />);

      vi.setSystemTime(Date.now() + 26 * 60_000);
      act(() => {
        document.dispatchEvent(new Event('visibilitychange'));
      });

      expect(vi.mocked(playAlarm)).not.toHaveBeenCalled();
      expect(FakeNotification.instances).toHaveLength(1);
      expect(document.title).toContain("Time's up");
    });
  });

  describe('notification permission', () => {
    it('is requested when the user starts a session', () => {
      render(<StartPomodoroButton taskId="task-1" />);

      fireEvent.click(screen.getByRole('button', { name: /start 25m/i }));

      expect(FakeNotification.requestPermission).toHaveBeenCalledTimes(1);
    });
  });
});
