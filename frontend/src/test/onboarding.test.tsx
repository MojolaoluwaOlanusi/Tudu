import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  useOnboardingStore,
  shouldOfferOnboarding,
  SNOOZE_DURATION_MS,
  type OnboardingStatus,
} from '../store/onboardingStore';
import { TOUR_STEPS } from '../data/onboardingSteps';
import OnboardingPrompt from '../components/onboarding/OnboardingPrompt';

/* ------------------------------------------------------------------ */
/* When should the tour be offered?                                   */
/* ------------------------------------------------------------------ */

const stateFor = (status: OnboardingStatus, snoozedAt: number | null = null) => ({
  status,
  snoozedAt,
  isTourOpen: false,
});

describe('shouldOfferOnboarding', () => {
  it('offers the tour to someone who has never been asked', () => {
    expect(shouldOfferOnboarding(stateFor('unseen'))).toBe(true);
  });

  it('stays quiet after the tour has been finished', () => {
    expect(shouldOfferOnboarding(stateFor('completed'))).toBe(false);
  });

  it('stays quiet forever after opting out', () => {
    // Far in the future, to prove the opt-out is not merely a long snooze.
    const now = Date.now() + SNOOZE_DURATION_MS * 100;
    expect(shouldOfferOnboarding(stateFor('opted-out'), now)).toBe(false);
  });

  it('does not re-ask within the week after a dismissal', () => {
    const dismissedAt = Date.now();
    const state = stateFor('snoozed', dismissedAt);
    expect(shouldOfferOnboarding(state, dismissedAt + 1000)).toBe(false);
    expect(shouldOfferOnboarding(state, dismissedAt + SNOOZE_DURATION_MS - 1000)).toBe(false);
  });

  it('asks again once the week has passed', () => {
    const dismissedAt = Date.now();
    const state = stateFor('snoozed', dismissedAt);
    expect(shouldOfferOnboarding(state, dismissedAt + SNOOZE_DURATION_MS)).toBe(true);
  });

  it('stays quiet when snoozed without a timestamp', () => {
    // We cannot prove a week has passed, so it must not nag.
    expect(
      shouldOfferOnboarding(stateFor('snoozed', null), Date.now() + SNOOZE_DURATION_MS * 2)
    ).toBe(false);
  });

  it('never interrupts a tour that is already running', () => {
    expect(shouldOfferOnboarding({ ...stateFor('unseen'), isTourOpen: true })).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/* Store transitions                                                  */
/* ------------------------------------------------------------------ */

describe('onboarding store', () => {
  beforeEach(() => {
    useOnboardingStore.setState({ status: 'unseen', snoozedAt: null, isTourOpen: false });
  });

  it('tapping outside snoozes for a week rather than opting out', () => {
    useOnboardingStore.getState().snoozePrompt();
    const { status, snoozedAt } = useOnboardingStore.getState();
    expect(status).toBe('snoozed');
    expect(snoozedAt).not.toBeNull();
  });

  it('opting out is permanent', () => {
    useOnboardingStore.getState().optOut();
    expect(useOnboardingStore.getState().status).toBe('opted-out');
  });

  it('finishing the tour stops offering it', () => {
    useOnboardingStore.getState().startTour();
    expect(useOnboardingStore.getState().isTourOpen).toBe(true);
    useOnboardingStore.getState().completeTour();
    expect(useOnboardingStore.getState()).toMatchObject({
      status: 'completed',
      isTourOpen: false,
    });
  });

  it('leaving mid-tour snoozes so it is offered again', () => {
    useOnboardingStore.getState().startTour();
    useOnboardingStore.getState().endTour();
    expect(useOnboardingStore.getState().status).toBe('snoozed');
  });
});

/* ------------------------------------------------------------------ */
/* The welcome prompt                                                 */
/* ------------------------------------------------------------------ */

describe('OnboardingPrompt', () => {
  beforeEach(() => {
    useOnboardingStore.setState({ status: 'unseen', snoozedAt: null, isTourOpen: false });
  });

  it('welcomes the user and offers three ways out', async () => {
    render(<OnboardingPrompt />);
    expect(await screen.findByTestId('onboarding-prompt')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /show me around/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /maybe later/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /don't show again/i })).toBeInTheDocument();
  });

  it('starts the tour when accepted', async () => {
    const user = userEvent.setup();
    render(<OnboardingPrompt />);
    await user.click(screen.getByRole('button', { name: /show me around/i }));
    expect(useOnboardingStore.getState().isTourOpen).toBe(true);
  });

  it('tapping the backdrop snoozes instead of opting out', async () => {
    const user = userEvent.setup();
    render(<OnboardingPrompt />);
    // The backdrop is the dialog element itself.
    await user.click(screen.getByTestId('onboarding-prompt'));
    expect(useOnboardingStore.getState().status).toBe('snoozed');
  });

  it('clicking inside the card does not dismiss it', async () => {
    const user = userEvent.setup();
    render(<OnboardingPrompt />);
    await user.click(screen.getByRole('heading', { name: /welcome to tudu/i }));
    expect(useOnboardingStore.getState().status).toBe('unseen');
  });

  it('"don\'t show again" opts out permanently', async () => {
    const user = userEvent.setup();
    render(<OnboardingPrompt />);
    await user.click(screen.getByRole('button', { name: /don't show again/i }));
    expect(useOnboardingStore.getState().status).toBe('opted-out');
  });
});

/* ------------------------------------------------------------------ */
/* Tour content                                                       */
/* ------------------------------------------------------------------ */

describe('tour steps', () => {
  it('has well-formed, unique steps', () => {
    const ids = TOUR_STEPS.map((step) => step.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const step of TOUR_STEPS) {
      expect(step.id).toBeTruthy();
      expect(step.title).toBeTruthy();
      expect(step.body.length).toBeGreaterThan(20);
      expect(step.emoji).toBeTruthy();
    }
  });

  it('opens and closes with a centred step', () => {
    expect(TOUR_STEPS[0].target).toBeUndefined();
    expect(TOUR_STEPS[TOUR_STEPS.length - 1].target).toBeUndefined();
  });

  /**
   * The tour is only as good as its anchors. A renamed or deleted `data-tour`
   * attribute would silently degrade a step to the centred fallback, so guard
   * the link between the step list and the components it points at.
   */
  it('only points at targets that exist in the source', () => {
    const walk = (dir: string): string[] =>
      readdirSync(dir).flatMap((entry) => {
        const full = join(dir, entry);
        return statSync(full).isDirectory() ? walk(full) : full;
      });

    const source = walk(join(process.cwd(), 'src'))
      // The step definitions themselves mention every target; excluding them
      // stops this test from passing trivially.
      .filter((file) => /\.tsx?$/.test(file) && !file.endsWith('onboardingSteps.ts'))
      .map((file) => readFileSync(file, 'utf8'))
      .join('\n');

    // `reveal` anchors are just as load-bearing: they are what opens a nested
    // panel, so a stale one means the step silently never reveals anything.
    const anchors = [
      ...TOUR_STEPS.map((step) => step.target),
      ...TOUR_STEPS.map((step) => step.reveal),
    ].filter((value): value is string => Boolean(value));
    expect(anchors.length).toBeGreaterThan(0);

    // Match the attribute as written, tolerating both a plain string value and
    // the conditional form used by PomodoroTimer.
    const attributeFor = (target: string) =>
      new RegExp(`data-tour=(?:"${target}"|\\{[^}]*'${target}'[^}]*\\})`);

    const missing = anchors.filter((target) => !attributeFor(target).test(source));
    // Comparing the missing list keeps a failure readable; asserting against
    // the whole bundle of source would dump thousands of lines.
    expect(missing, 'tour steps point at data-tour attributes that do not exist').toEqual([]);
  });

  it('reveals the sub-task panel before pointing at the AI breakdown button', () => {
    // The AI button is nested inside the collapsible sub-task panel, so without
    // a reveal it would never exist for anyone who has not expanded it.
    const ai = TOUR_STEPS.find((step) => step.target === 'ai-breakdown');
    expect(ai).toBeDefined();
    expect(ai?.reveal).toBe('subtasks');
  });
});
