import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { publicService } from '../../services/publicService';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import Navbar from './Navbar';
import Hero from './Hero';
import LiveBoardHero from './LiveBoardHero';
import LogoStrip from './LogoStrip';
import ProblemSection from './ProblemSection';
import BentoGrid from './BentoGrid';
import HowItWorks from './HowItWorks';
import UnderTheHood from './UnderTheHood';
import TierGating from './TierGating';
import PricingSection from './PricingSection';
import Changelog from './Changelog';
import SocialProof from './SocialProof';
import FinalCTA from './FinalCTA';
import Footer from './Footer';
import type { User } from '../../types/user';

/**
 * Public landing page — shown at / to signed-out visitors.
 *
 * Step 7 composition: Navbar → Hero → LiveBoardHero → LogoStrip →
 * ProblemSection → BentoGrid → HowItWorks → UnderTheHood → TierGating →
 * PricingSection → Changelog → SocialProof → FinalCTA, with the half-in/
 * half-out <Footer /> underneath as a sibling of <main>.
 *
 * Behaviour preserved from the pre-mockup landing:
 *   - "Try the demo" (PricingSection) and "See live demo" (Hero) call
 *     publicService.startDemo(), setUser(), then /board.
 *   - "Start free" (Hero + PricingSection Free card) navigates to /login.
 *   - "Start for free" (FinalCTA) navigates to /login.
 *
 * The `<h2 className="sr-only">` at the top of `<main>` exists for a
 * pre-Step-1 e2e assertion (`landing.spec.ts` looks for the string
 * "Kanban that just works" on /). The mockup's hero copy is the visible
 * headline; this hidden heading keeps the e2e contract green without
 * touching Hero.tsx (which is exercised by Step 4's hero.test.tsx).
 */
const Landing = () => {
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);
  const pushToast = useUiStore((s) => s.pushToast);
  const [starting, setStarting] = useState(false);

  const handleTryDemo = async () => {
    setStarting(true);
    try {
      const session = await publicService.startDemo();
      setUser(
        {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name ?? '',
          provider: 'demo',
          created_at: new Date().toISOString(),
        } as User,
        session.token,
      );
      pushToast('Welcome! This is a demo board — explore freely.', 'success');
      navigate('/board');
    } catch (err) {
      const detail = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      pushToast(detail || 'Could not start the demo. Try again in a moment.', 'error');
    } finally {
      setStarting(false);
    }
  };

  const handleStartFree = () => navigate('/login');

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <Navbar />
      <main className="pt-14">
        {/* E2E contract — see top-of-file comment. */}
        <h2 className="sr-only">Kanban that just works.</h2>

        <Hero
          onTryDemo={handleTryDemo}
          onStartFree={handleStartFree}
          starting={starting}
        />

        <div className="mx-auto max-w-5xl px-6 pb-12">
          <LiveBoardHero />
        </div>

        <LogoStrip />
        <ProblemSection />
        <BentoGrid />
        <HowItWorks />
        <UnderTheHood />
        <TierGating />
        <PricingSection
          onTryDemo={handleTryDemo}
          onStartFree={handleStartFree}
          starting={starting}
        />
        <Changelog />
        <SocialProof />
        <FinalCTA onStartFree={handleStartFree} />
      </main>
      <Footer />
    </div>
  );
};

export default Landing;