import React, { createContext, useContext, useRef } from 'react';
import Confetti, { type ConfettiHandle } from './Confetti';

/**
 * App-wide confetti, so any component can celebrate without threading a ref
 * down through the tree.
 */
const ConfettiContext = createContext<ConfettiHandle | null>(null);

export const ConfettiProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const confetti = useRef<ConfettiHandle>(null);

  return (
    <ConfettiContext.Provider value={confetti.current}>
      {children}
      <Confetti ref={confetti} />
    </ConfettiContext.Provider>
  );
};

/**
 * Returns a `burst(origin?)` function. Safe to call outside the provider -
 * it simply does nothing, so a missing provider never crashes a component.
 */
export const useConfetti = (): ConfettiHandle => {
  const context = useContext(ConfettiContext);
  return (
    context ?? {
      burst: () => {
        /* no-op when rendered outside the provider */
      },
    }
  );
};

export default Confetti;