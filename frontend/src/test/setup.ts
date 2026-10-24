import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Unmount between tests so a leaked DOM tree cannot satisfy the next assertion.
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// jsdom implements neither of these, and both are used by Chart.js.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = globalThis.ResizeObserver ?? (ResizeObserverStub as never);

// jsdom also does not implement IntersectionObserver, which framer-motion's
// `whileInView` feature (used by ProblemSection, BentoGrid and the marketing
// animations) requires at mount. Without a stub, any test rendering a
// `motion.*` component with `whileInView` crashes with
// `ReferenceError: IntersectionObserver is not defined`.
//
// A no-op stub is sufficient for tests: elements still render, styles still
// apply (initial opacity 0 does not remove them from the accessibility tree),
// and DOM/role queries still find them. Whether the intersection callback
// ever fires is irrelevant to the assertions we make here.
class IntersectionObserverStub {
  root: Element | null = null;
  rootMargin = '';
  thresholds: number[] = [];
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}
globalThis.IntersectionObserver =
  globalThis.IntersectionObserver ??
  (IntersectionObserverStub as unknown as typeof IntersectionObserver);

// jsdom does not implement Element.prototype.scrollIntoView. Any component
// that scrolls a highlighted row into view (the command palette, future
// list-with-cursor features) would throw without this. Stubbed once, here.
if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = function scrollIntoView() {};
}

// React 18's act() warnings fire loudly in CI otherwise.
(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;