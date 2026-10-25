import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useUiStore } from '../store/uiStore';
import { useShortcutHelpStore } from '../store/shortcutHelpStore';
import { useCommandPaletteStore } from '../store/commandPaletteStore';
import { toggleDensity } from '../lib/density';

const CHORD_TIMEOUT_MS = 1200;

const isEditable = (target: EventTarget | null): boolean => {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return el.isContentEditable === true;
};

const isModalOpen = (): boolean =>
  !!document.querySelector('[role="dialog"][aria-modal="true"]');

const focusQueryBar = (): boolean => {
  const input = document.querySelector<HTMLInputElement>('[data-shortcut-search]');
  if (!input) return false;
  input.focus();
  return true;
};

export const useKeyboardShortcuts = (): void => {
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.token);
  const openTaskForm = useUiStore((s) => s.openTaskForm);
  const closeTaskForm = useUiStore((s) => s.closeTaskForm);
  const isTaskFormOpen = useUiStore((s) => s.isTaskFormOpen);
  const toggleFilters = useUiStore((s) => s.toggleFilters);
  const openShortcutHelp = useShortcutHelpStore((s) => s.open);
  const closeShortcutHelp = useShortcutHelpStore((s) => s.close);
  const openCommandPalette = useCommandPaletteStore((s) => s.open);

  const chordRef = useRef<{ key: string; at: number } | null>(null);

  useEffect(() => {
    if (!token) return;

    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        closeShortcutHelp();
        openCommandPalette();
        return;
      }

      if (
        (event.ctrlKey || event.metaKey) &&
        event.shiftKey &&
        event.key.toLowerCase() === 'd'
      ) {
        event.preventDefault();
        toggleDensity();
        return;
      }

      if (event.ctrlKey || event.metaKey || event.altKey) return;

      if (event.key === 'Escape') {
        chordRef.current = null;
        window.dispatchEvent(new Event('tudu:escape'));
        if (isTaskFormOpen) closeTaskForm();
        return;
      }

      if (isEditable(event.target)) return;

      if (isModalOpen()) {
        chordRef.current = null;
        return;
      }

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
      if (event.key.toLowerCase() === 'f') {
        event.preventDefault();
        toggleFilters();
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
    token, navigate, openTaskForm, closeTaskForm, isTaskFormOpen, toggleFilters,
    openShortcutHelp, closeShortcutHelp, openCommandPalette,
  ]);
};
