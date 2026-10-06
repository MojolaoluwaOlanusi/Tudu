/**
 * Finish alerts for the Pomodoro timer: alarm sound, desktop notification,
 * tab-title hint and a vibration buzz.
 */
let titleToRestore: string | null = null;

const FINISH_TITLE = "⏰ 00:00 Time's up! - Tudu";

let audioContext: AudioContext | null = null;

/**
 * Long, unmistakable finish tone that lasts ~10 seconds so it is clearly
 * audible even if the user is in another tab or a different app.
 */
export const playAlarm = (): void => {
  try {
    const scope = window as Window & {
      AudioContext?: typeof AudioContext;
      webkitAudioContext?: typeof AudioContext;
    };
    const AudioContextCtor = scope.AudioContext ?? scope.webkitAudioContext;
    if (!AudioContextCtor) return;

    audioContext ??= new AudioContextCtor();
    const context = audioContext;

    if (context.state === 'suspended') void context.resume();

    const startAt = context.currentTime;
    const pattern = [880, 660, 784, 932, 1046, 932, 784, 660, 523, 659];

    pattern.forEach((frequency, index) => {
      const offset = index * 1.05;
      const oscillator = context.createOscillator();
      const gain = context.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, startAt + offset);
      gain.gain.exponentialRampToValueAtTime(0.18, startAt + offset + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + offset + 0.9);

      oscillator.connect(gain);
      gain.connect(context.destination);

      oscillator.start(startAt + offset);
      oscillator.stop(startAt + offset + 0.92);
    });
  } catch {
    // Browser audio is best effort; other alerts still fire.
  }
};

/**
 * Ask for desktop-notification permission while the user is still interacting
 * with the page (Safari refuses the request outside a gesture), and only when
 * the browser has not already decided.
 */
export const requestNotificationPermission = (): void => {
  try {
    if (typeof Notification === 'undefined') return;
    if (Notification.permission !== 'default') return;
    void Notification.requestPermission();
  } catch {
    // Some platforms throw when called without a user gesture; ignore it.
  }
};

/** Desktop notification for a finished session, once permission is granted. */
export const showFinishNotification = (body: string): void => {
  try {
    if (typeof Notification === 'undefined') return;
    if (Notification.permission !== 'granted') return;
    const notification = new Notification("⏰ Time's up!", {
      body,
      tag: 'pomodoro-finished',
    });
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  } catch {
    // Construction can throw on some platforms; the sound still played.
  }
};

/** Swap the tab title for a "Time's up!" hint until {@link restoreFinishTitle}. */
export const showFinishTitle = (): void => {
  if (titleToRestore !== null) return;
  titleToRestore = document.title;
  document.title = FINISH_TITLE;
};

/** Put the original tab title back (a no-op if it was never changed). */
export const restoreFinishTitle = (): void => {
  if (titleToRestore === null) return;
  document.title = titleToRestore;
  titleToRestore = null;
};

/** A short buzz on devices that support the Vibration API. */
export const buzz = (): void => {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate([200, 100, 200]);
    }
  } catch {
    // Vibration is best-effort.
  }
};
