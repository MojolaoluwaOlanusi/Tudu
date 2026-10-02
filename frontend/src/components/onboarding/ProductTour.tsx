import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useOnboardingStore } from '../../store/onboardingStore';
import { useUiStore } from '../../store/uiStore';
import { TOUR_STEPS, type Placement } from '../../data/onboardingSteps';

/** Breathing room between the spotlight cutout and the real element. */
const PAD = 6;
/** Gap between the spotlight and the card. */
const GAP = 14;
/** Keep the card this far from the viewport edges. */
const MARGIN = 12;
const CARD_WIDTH = 320;
/** Below this much free space we would rather flip the card to the other side. */
const MIN_SPACE = 200;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), Math.max(min, max));

interface PlacementBox {
  top: number;
  left: number;
  /** Where the little arrow points, as an offset along the cross axis. */
  arrow: number;
  side: Placement;
}

const OPPOSITE: Record<Placement, Placement> = {
  top: 'bottom',
  bottom: 'top',
  left: 'right',
  right: 'left',
};

/**
 * Work out where the card should sit relative to the spotlight, flipping to the
 * opposite side when there is not enough room, then clamping it on screen.
 */
const placeCard = (
  rect: DOMRect,
  preferred: Placement,
  cardHeight: number,
  vw: number,
  vh: number
): PlacementBox => {
  const room: Record<Placement, number> = {
    top: rect.top - GAP - MARGIN,
    bottom: vh - rect.bottom - GAP - MARGIN,
    left: rect.left - GAP - MARGIN,
    right: vw - rect.right - GAP - MARGIN,
  };

  let side = preferred;
  if (room[preferred] < MIN_SPACE && room[OPPOSITE[preferred]] > room[preferred]) {
    side = OPPOSITE[preferred];
  }

  const maxTop = vh - cardHeight - MARGIN;
  const maxLeft = vw - CARD_WIDTH - MARGIN;
  const centreX = rect.left + rect.width / 2;
  const centreY = rect.top + rect.height / 2;

  if (side === 'left' || side === 'right') {
    const top = clamp(centreY - cardHeight / 2, MARGIN, maxTop);
    const left = side === 'right' ? rect.right + GAP : rect.left - GAP - CARD_WIDTH;
    const placed = clamp(left, MARGIN, maxLeft);
    return { top, left: placed, arrow: centreY - top, side };
  }

  const left = clamp(centreX - CARD_WIDTH / 2, MARGIN, maxLeft);
  const top = side === 'bottom' ? rect.bottom + GAP : rect.top - GAP - cardHeight;
  return { top: clamp(top, MARGIN, maxTop), left, arrow: centreX - left, side };
};

/**
 * The guided tour: a spotlight over the current element with a card of
 * friendly copy beside it.
 *
 * Deliberately resilient - a brand new account has no tasks, so several
 * targets do not exist yet. Rather than dead-ending, those steps fall back to
 * a centred card and the tour carries on.
 */
const ProductTour: React.FC = () => {
  const isTourOpen = useOnboardingStore((state) => state.isTourOpen);
  const completeTour = useOnboardingStore((state) => state.completeTour);
  const endTour = useOnboardingStore((state) => state.endTour);
  const openTaskForm = useUiStore((state) => state.openTaskForm);
  const closeTaskForm = useUiStore((state) => state.closeTaskForm);

  const navigate = useNavigate();
  const location = useLocation();

  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [cardHeight, setCardHeight] = useState(220);
  const cardRef = useRef<HTMLDivElement>(null);

  const step = TOUR_STEPS[index];
  const isLast = index === TOUR_STEPS.length - 1;

  const measure = useCallback(() => {
    if (!isTourOpen || !step.target) {
      setRect(null);
      return;
    }
    const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
    if (!el) {
      setRect(null);
      return;
    }
    const r = el.getBoundingClientRect();
    // A zero-size element (the sidebar, while hidden on a phone) is not worth
    // spotlighting; treat it as absent so the card centres instead.
    setRect(r.width > 0 && r.height > 0 ? r : null);
  }, [isTourOpen, step.target]);

  /* --------- Put the right screen and the right UI on before measuring ------ */
  useEffect(() => {
    if (!isTourOpen) return;
    if (step.route && step.route !== location.pathname) {
      navigate(step.route);
    }
    if (step.openTaskForm) openTaskForm();
    else closeTaskForm();
  }, [isTourOpen, step, navigate, location.pathname, openTaskForm, closeTaskForm]);

  /* --------------------------- Position the spotlight --------------------- */
  useEffect(() => {
    if (!isTourOpen) return;

    // Some targets only exist once their container is open - the AI breakdown
    // button lives inside the collapsible sub-task panel. Open it ourselves,
    // but only when the target is genuinely absent, so a panel the user already
    // expanded is never toggled shut again.
    if (step.reveal && step.target) {
      const alreadyThere = document.querySelector(`[data-tour="${step.target}"]`);
      if (!alreadyThere) {
        document
          .querySelector(`[data-tour="${step.reveal}"]`)
          ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      }
    }

    if (step.target) {
      document
        .querySelector<HTMLElement>(`[data-tour="${step.target}"]`)
        ?.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });
    }
    measure();
  }, [isTourOpen, step.target, step.reveal, measure]);

  // Routes render asynchronously, and revealing a panel shifts the layout, so
  // re-measure once things have settled.
  useEffect(() => {
    if (!isTourOpen) return;
    const id = window.setTimeout(measure, 150);
    return () => window.clearTimeout(id);
  }, [isTourOpen, location.pathname, step.reveal, measure]);

  // Keep the spotlight pinned to the element while the page scrolls or resizes.
  useEffect(() => {
    if (!isTourOpen) return;
    const onChange = () => measure();
    window.addEventListener('resize', onChange);
    window.addEventListener('scroll', onChange, true);
    return () => {
      window.removeEventListener('resize', onChange);
      window.removeEventListener('scroll', onChange, true);
    };
  }, [isTourOpen, measure]);

  /* ------------------------------ Navigation ------------------------------ */
  const goTo = useCallback(
    (next: number) => setIndex(clamp(next, 0, TOUR_STEPS.length - 1)),
    []
  );

  const finish = useCallback(() => {
    closeTaskForm();
    completeTour();
  }, [closeTaskForm, completeTour]);

  const leave = useCallback(() => {
    closeTaskForm();
    // Bailing out early snoozes rather than completing, so the tour is offered
    // again in a week instead of being written off.
    endTour();
  }, [closeTaskForm, endTour]);

  useEffect(() => {
    if (!isTourOpen) {
      setIndex(0);
      return;
    }
    cardRef.current?.focus();
  }, [isTourOpen, index]);

  useEffect(() => {
    if (!isTourOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') leave();
      else if (event.key === 'ArrowRight') isLast ? finish() : goTo(index + 1);
      else if (event.key === 'ArrowLeft') goTo(index - 1);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isTourOpen, index, isLast, finish, goTo, leave]);

  /* Keep the measured height in sync so flipping sides never overflows. */
  useLayoutEffect(() => {
    if (cardRef.current) setCardHeight(cardRef.current.offsetHeight);
  }, [step.id]);

  if (!isTourOpen) return null;
  const vw = typeof window === 'undefined' ? 1024 : window.innerWidth;
  const vh = typeof window === 'undefined' ? 768 : window.innerHeight;
  const box = rect ? placeCard(rect, step.placement ?? 'bottom', cardHeight, vw, vh) : null;

  const arrowOnVerticalAxis = box?.side === 'left' || box?.side === 'right';

  return (
    <>
      {/* Dimmed backdrop with a cutout over the current target. pointer-events
          are off, so the app underneath stays usable while the tour runs. */}
      <div className="pointer-events-none fixed inset-0 z-50" aria-hidden="true">
        <svg className="h-full w-full">
          <defs>
            <mask id="tour-spotlight-mask">
              <rect width="100%" height="100%" fill="white" />
              {rect && (
                <rect
                  x={rect.left - PAD}
                  y={rect.top - PAD}
                  width={rect.width + PAD * 2}
                  height={rect.height + PAD * 2}
                  rx={14}
                  fill="black"
                />
              )}
            </mask>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="rgba(15, 23, 20, 0.62)"
            mask="url(#tour-spotlight-mask)"
          />
        </svg>

        {rect && (
          <div
            className="absolute rounded-2xl ring-2 ring-accent"
            style={{
              top: rect.top - PAD,
              left: rect.left - PAD,
              width: rect.width + PAD * 2,
              height: rect.height + PAD * 2,
            }}
          />
        )}
      </div>

      <div
        className="pointer-events-auto fixed z-[60]"
        style={
          box
            ? { top: box.top, left: box.left, width: CARD_WIDTH }
            : // No target on screen: centre the card and keep going.
              { top: '50%', left: '50%', width: CARD_WIDTH, transform: 'translate(-50%, -50%)' }
        }
      >
        <div
          ref={cardRef}
          role="dialog"
          aria-labelledby="tour-step-title"
          tabIndex={-1}
          data-testid="tour-card"
          className="card animate-pop-in relative p-5 outline-none"
        >
          {box && (
            <span
              aria-hidden="true"
              className={`absolute h-3 w-3 rotate-45 border-accent bg-surface ${
                box.side === 'bottom'
                  ? '-top-1.5 border-l border-t'
                  : box.side === 'top'
                    ? '-bottom-1.5 border-b border-r'
                    : box.side === 'right'
                      ? '-left-1.5 border-b border-l'
                      : '-right-1.5 border-t border-r'
              }`}
              style={
                arrowOnVerticalAxis
                  ? { top: clamp(box.arrow - 6, 12, Math.max(12, cardHeight - 24)) }
                  : { left: clamp(box.arrow - 6, 12, CARD_WIDTH - 24) }
              }
            />
          )}

          <div className="flex items-start gap-3">
            <span aria-hidden="true" className="text-2xl leading-none">
              {step.emoji}
            </span>
            <div className="min-w-0 flex-1">
              <h2
                id="tour-step-title"
                className="font-handwritten text-2xl leading-tight text-ink"
              >
                {step.title}
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{step.body}</p>
            </div>
          </div>

          {step.example && (
            <div className="mt-3 rounded-xl border border-hairline bg-surface-2 p-3">
              <p className="text-xs font-medium text-ink">&ldquo;{step.example.input}&rdquo;</p>
              <p className="mt-0.5 text-[11px] text-ink-muted">&rarr; {step.example.result}</p>
            </div>
          )}

          <div className="mt-4 flex items-center justify-between gap-3">
            <span className="text-[11px] font-medium text-ink-muted">
              Step {index + 1} of {TOUR_STEPS.length}
            </span>
            <button
              type="button"
              onClick={leave}
              className="text-xs font-medium text-ink-muted transition-colors hover:text-ink"
            >
              Skip tour
            </button>
          </div>

          <div className="mt-2 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => goTo(index - 1)}
              disabled={index === 0}
              className="btn-ghost"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => (isLast ? finish() : goTo(index + 1))}
              className="btn-accent"
              data-testid="tour-next"
            >
              {isLast ? 'Finish' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
export default ProductTour;

