import { useEffect, useState } from 'react';

interface TitlebarRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface WindowControlsOverlayLike extends EventTarget {
  visible: boolean;
  getTitlebarAreaRect: () => DOMRect;
}

/**
 * Reads the Window Controls Overlay geometry.
 *
 * Returns `visible: false` and the fallback rect on every platform that does
 * not support WCO — browsers, mobile, macOS in some versions, and any desktop
 * PWA whose manifest did not opt in. Callers treat that as "render the normal
 * header", so nothing regresses where WCO does not apply.
 */
export const useWindowControlsOverlay = () => {
  const [visible, setVisible] = useState(false);
  const [rect, setRect] = useState<TitlebarRect>({ x: 0, y: 0, width: 0, height: 0 });

  useEffect(() => {
    const wco = (navigator as unknown as { windowControlsOverlay?: WindowControlsOverlayLike })
      .windowControlsOverlay;
    if (!wco) return;

    const update = () => {
      setVisible(wco.visible);
      const r = wco.getTitlebarAreaRect();
      setRect({ x: r.x, y: r.y, width: r.width, height: r.height });
    };

    update();
    wco.addEventListener('geometrychange', update);
    return () => wco.removeEventListener('geometrychange', update);
  }, []);

  return { visible, rect };
};