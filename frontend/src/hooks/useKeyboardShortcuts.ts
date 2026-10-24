import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useUiStore } from '../store/uiStore';
import { useShortcutHelpStore } from '../store/shortcutHelpStore';
import { useCommandPaletteStore } from '../store/commandPaletteStore';
import { toggleDensity } from '../lib/density';

const CHORD_TIMEOUT_MS = 1200;

/** True when the event target is a form field or a contenteditable. */
const isEditable = (target: EventTarget | null): boolean => {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return el.isContentEditable === true;
};

/** True when any modal (role=dialog + aria-modal) is open. */
const isModalOpen = (): boolean =>
  !!document.querySelector('[role="dialog"][aria-modal="true"]');

/** Focus the query bar if the List view is mounted. */
const focusQueryBar = (): boolean => {
  const input = document.querySelector<HTMLInputElement>('[data-shortcut-search]');
  if (!input) return false;
  input.focus();
  return true;
};

/**
 * Global keyboard shortcuts.
 *
 * Skips silently when:
 *   - the user is signed out,
 *   - focus is inside an input / textarea / select / contenteditable, or
 *   - any modal (role=dialog + aria-modal) is open,
 * so single-key shortcuts never fight with typing or a modal.
 *
 * Ctrl/Cmd+K and Ctrl/Cmd+Shift+D are the exceptions: they fire from
 * anywhere, including inputs.
 */
export const useKeyboardShortcuts = (): void => {
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.token);
  const openTaskForm = useUiStore((s) => s.openTaskForm);
  const closeTaskForm = useUiStore((s) => s.closeTaskForm);
  const isTaskFormOpen = useUiStore((s) => s.isTaskFormOpen);
  const openShortcutHelp = useShortcutHelpStore((s) => s.open);
  const closeShortcutHelp = useShortcutHelpStore((s) => s.close);
  const openCommandPalette = useCommandPaletteStore((s) => s.open);

  const chordRef = useRef<{ key: string; at: number } | null>(null);

  useEffect(() => {
    if (!token) return;

    const handler = (event: KeyboardEvent) => {
      // Ctrl/Cmd+K works from anywhere, even inside a form field.
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        closeShortcutHelp();
        openCommandPalette();
        return;
      }

      // Ctrl/Cmd+Shift+D toggles density (mockup parity).
      if (
        (event.ctrlKey || event.metaKey) &&
        event.shiftKey &&
        event.key.toLowerCase() === 'd'
      ) {
        event.preventDefault();
        toggleDensity();
        return;
      }

      // Any other modifier combo belongs to the browser or the OS.
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      // Esc always runs, even from inside a modal or a text field.
      if (event.key === 'Escape') {
        chordRef.current = null;
        // The List view listens for this to leave select mode.
        window.dispatchEvent(new Event('tudu:escape'));
        if (isTaskFormOpen) closeTaskForm();
        return;
      }

      // Single-key shortcuts are skipped while typing.
      if (isEditable(event.target)) return;

      // Also skipped while any modal is open, so "n" cannot open a second
      // form on top of the first one.
      if (isModalOpen()) {
        chordRef.current = null;
        return;
      }

      // Chord: "g" followed by a letter within CHORD_TIMEOUT_MS.
      if (chordRef.current && Date.now() - chordRef.current.at < CHORD_TIMEOUT_MS) {
        const next = event.key.toLowerCase();
        if (chordRef.current.key === 'g') {
          chordRef.current = null;
          if (next === 'b') { event.preventDefault(); navigate('/board'); return; }
          if (next === 'l') { event.preventDefault(); navigate('/'); return; }
          if (next === 's') { event.preventDefault(); navigate('/stats'); return; }
          if (next === 'a') { event.preventDefault(); navigate('/analytics'); return; }
        }
      }

      if (event.key === 'g') {
        chordRef.current = { key: 'g', at: Date.now() };
        return;
      }

      // Single-key shortcuts.
      if (event.key === 'n') {
        const path = window.location.pathname;
        if (path === '/' || path === '/board') {
          event.preventDefault();
          openTaskForm(null);
        }
        return;
      }
      if (event.key === '/') {
        if (focusQueryBar()) event.preventDefault();
        return;
      }
      if (event.key === '?') {
        event.preventDefault();
        openShortcutHelp();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [
    token,
    navigate,
    openTaskForm,
    closeTaskForm,
    isTaskFormOpen,
    openShortcutHelp,
    closeShortcutHelp,
    openCommandPalette,
  ]);
};
