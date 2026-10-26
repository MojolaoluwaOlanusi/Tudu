import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useOnboardingStore } from '../../store/onboardingStore';
import { useUiStore } from '../../store/uiStore';
import { TOUR_STEPS, type Placement } from '../../data/onboardingSteps';

const PAD = 6;
const GAP = 14;
const MARGIN = 12;
const CARD_WIDTH = 320;
const MIN_SPACE = 200;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), Math.max(min, max));

interface PlacementBox {
  top: number;
  left: number;
  arrow: number;
  side: Placement;
}

const OPPOSITE: Record<Placement, Placement> = {
  top: 'bottom',
  bottom: 'top',
  left: 'right',
  right: 'left',
};

const placeCard = (
  rect: DOMRect,
  preferred: Placement,
  cardHeight: number,
  vw: number,
  vh: number,
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
 * The guided tour. Step 11 polish: brand-tinted emoji badge, progress bar
 * at the bottom of the card, explicit card classes (rather than `.card` so
 * the brush edge does not clash with `animate-pop-in`), and the Skip
 * affordance toned down to a quiet `text-ink-faint` link.
 *
 * Behaviour unchanged: spotlight mask, placement/flip logic, keyboard
 * arrows, Escape to leave, and the same `data-testid` / `Step N of M`
 * contract that `onboarding.test.tsx` asserts on.
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
    setRect(r.width > 0 && r.height > 0 ? r : null);
  }, [isTourOpen, step.target]);

  useEffect(() => {
    if (!isTourOpen) return;
    if (step.route && step.route !== location.pathname) navigate(step.route);
    if (step.openTaskForm) openTaskForm();
    else closeTaskForm();
  }, [isTourOpen, step, navigate, location.pathname, openTaskForm, closeTaskForm]);

  useEffect(() => {
    if (!isTourOpen) return;
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

  useEffect(() => {
    if (!isTourOpen) return;
    const id = window.setTimeout(measure, 150);
    return () => window.clearTimeout(id);
  }, [isTourOpen, location.pathname, step.reveal, measure]);

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

  const goTo = useCallback(
    (next: number) => setIndex(clamp(next, 0, TOUR_STEPS.length - 1)),
    [],
  );

  const finish = useCallback(() => {
    closeTaskForm();
    completeTour();
  }, [closeTaskForm, completeTour]);

  const leave = useCallback(() => {
    closeTaskForm();
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
            className="absolute rounded-2xl ring-2 ring-brand"
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
            : { top: '50%', left: '50%', width: CARD_WIDTH, transform: 'translate(-50%, -50%)' }
        }
      >
        <div
          ref={cardRef}
          role="dialog"
          aria-labelledby="tour-step-title"
          tabIndex={-1}
          data-testid="tour-card"
          className="animate-pop-in relative rounded-2xl border border-hairline bg-surface p-5 shadow-xl outline-none"
        >
          {box && (
            <span
              aria-hidden="true"
              className={`absolute h-3 w-3 rotate-45 border-brand bg-surface ${
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
            <span
              aria-hidden="true"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand/15 text-2xl"
            >
              {step.emoji}
            </span>
            <div className="min-w-0 flex-1">
              <h2
                id="tour-step-title"
                className="font-handwritten text-2xl leading-tight text-ink"
              >
                {step.title}
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
                {step.body}
              </p>
            </div>
          </div>

          {step.example && (
            <div className="mt-3 rounded-xl border border-line-subtle bg-canvas p-3">
              <p className="text-xs font-medium text-ink">
                &ldquo;{step.example.input}&rdquo;
              </p>
              <p className="mt-0.5 text-[11px] text-ink-muted">
                &rarr; {step.example.result}
              </p>
            </div>
          )}

          <div className="mt-4 flex items-center gap-1" aria-hidden="true">
            {TOUR_STEPS.map((s, i) => (
              <span
                key={s.id}
                className={
                  'h-1 flex-1 rounded-full transition-colors ' +
                  (i <= index ? 'bg-brand' : 'bg-line-subtle')
                }
              />
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="text-[11px] font-medium text-ink-muted">
              Step {index + 1} of {TOUR_STEPS.length}
            </span>
            <button
              type="button"
              onClick={leave}
              className="text-[11px] font-medium text-ink-faint transition-colors hover:text-ink"
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
              className="btn-accent brush-stroke"
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