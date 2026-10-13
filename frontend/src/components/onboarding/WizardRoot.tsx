import { useEffect, useState } from 'react';
import Wizard from './Wizard';
import { useBoards } from '../../hooks/useBoards';
import { useAuthStore } from '../../store/authStore';

/**
 * Decides whether the onboarding wizard should be shown.
 *
 * The wizard only appears when ALL of these are true:
 *   - the user is signed in,
 *   - this browser has not completed or skipped the wizard yet, and
 *   - the user has exactly one board, with zero cards on it.
 *
 * A user who has created a board, has been added to a workspace, or has been
 * given a demo account from the landing page therefore never sees it. A user
 * who dismisses it is not asked again on this browser.
 */
const STORAGE_KEY = 'tudu.onboarding.wizard.v1';
const WizardRoot = () => {
  const token = useAuthStore((s) => s.token);
  const { data: boards, isLoading } = useBoards();
  const [dismissed, setDismissed] = useState(false);

  const alreadyCompleted =
    typeof window !== 'undefined' && window.localStorage.getItem(STORAGE_KEY) === 'true';

  useEffect(() => {
    // Nothing to do when the flag is already set; nothing to do while the
    // boards list is still loading.
    if (alreadyCompleted || isLoading) return;
  }, [alreadyCompleted, isLoading]);

  if (!token) return null;
  if (alreadyCompleted || dismissed) return null;
  if (isLoading || !boards) return null;
  if (boards.length !== 1) return null;
  if ((boards[0]?.task_count ?? 0) > 0) return null;

  const handleDone = () => {
    window.localStorage.setItem(STORAGE_KEY, 'true');
    setDismissed(true);
  };

  return <Wizard onDone={handleDone} />;
};

export default WizardRoot;
