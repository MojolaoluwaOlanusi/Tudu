import React from 'react';
import { useAuthStore } from '../../store/authStore';
import { useOnboardingStore, shouldOfferOnboarding } from '../../store/onboardingStore';
import OnboardingPrompt from './OnboardingPrompt';
import ProductTour from './ProductTour';

/**
 * Mounts the onboarding pieces.
 *
 * Deliberately mounted once at the app root rather than inside the page
 * `Shell`: the tour navigates between routes, and anything rendered inside a
 * route would be unmounted and lose its place mid-tour.
 */
const OnboardingRoot: React.FC = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const status = useOnboardingStore((state) => state.status);
  const snoozedAt = useOnboardingStore((state) => state.snoozedAt);
  const isTourOpen = useOnboardingStore((state) => state.isTourOpen);

  // Never interrupt the tour itself with the "want a tour?" prompt.
  if (isAuthenticated && shouldOfferOnboarding({ status, snoozedAt, isTourOpen })) {
    return (
      <>
        <OnboardingPrompt />
        <ProductTour />
      </>
    );
  }

  return isTourOpen ? <ProductTour /> : null;
};

export default OnboardingRoot;
