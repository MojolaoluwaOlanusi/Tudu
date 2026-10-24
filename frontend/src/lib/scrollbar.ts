/**
 * Attach the "hidden-until-scrolling" scrollbar behaviour to any element.
 *
 * The `[data-scrollbar-auto-hide]` rules in index.css hide the thumb at rest;
 * this helper toggles `.is-scrolling` on the element itself for 800ms after
 * each scroll event, which fades the thumb in. Returns a cleanup function.
 *
 * Idempotent: calling it twice on the same element only adds one listener.
 */
const ATTACHED = new WeakSet<HTMLElement>();

export function attachScrollbarAutoHide(el: HTMLElement): () => void {
  if (ATTACHED.has(el)) return () => {};
  ATTACHED.add(el);
  el.setAttribute('data-scrollbar-auto-hide', '');

  let timer: number | undefined;
  const onScroll = () => {
    el.classList.add('is-scrolling');
    window.clearTimeout(timer);
    timer = window.setTimeout(() => el.classList.remove('is-scrolling'), 800);
  };
  el.addEventListener('scroll', onScroll, { passive: true });

  return () => {
    el.removeEventListener('scroll', onScroll);
    window.clearTimeout(timer);
    el.classList.remove('is-scrolling');
    ATTACHED.delete(el);
  };
}
