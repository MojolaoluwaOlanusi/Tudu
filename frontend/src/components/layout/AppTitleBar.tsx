import React from 'react';
import { useWindowControlsOverlay } from '../../hooks/useWindowControlsOverlay';

/**
 * A slim drag strip that only renders when the Window Controls Overlay is
 * active. It fills the area the OS title bar would have occupied, draws a
 * subtle hairline below itself, and is fully draggable.
 *
 * Nothing here is interactive — the interactive app content lives in the
 * Header immediately below. That keeps the drag region large and the
 * no-drag exceptions to a minimum.
 */
const AppTitleBar: React.FC = () => {
  const { visible, rect } = useWindowControlsOverlay();
  if (!visible) return null;

  return (
    <div
      className="wco-drag fixed left-0 top-0 z-50 border-b border-hairline bg-surface"
      style={{
        height: rect.height || 32,
        // The overlay reserves the left edge on macOS and the right edge on
        // Windows. CSS env() gives us the free strip either way.
        marginLeft: `env(titlebar-area-x, 0)`,
        width: `env(titlebar-area-width, 100%)`,
      }}
      aria-hidden="true"
    />
  );
};

export default AppTitleBar;