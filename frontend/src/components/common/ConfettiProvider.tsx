import React, { createContext, useCallback, useContext, useRef } from 'react';
import Confetti, { type ConfettiHandle } from './Confetti';

/**
 * App-wide confetti, so any component can celebrate without threading a ref
 * down through the tree.
 */
const ConfettiContext = createContext<ConfettiHandle | null>(null);

export const ConfettiProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const handle = useRef<ConfettiHandle | null>(null);

  // The context value must be a stable function that reads the ref when it is
  // *called*. Passing `handle.current` as the value does not work: the
  // provider renders before the child assigns the ref, so the value is
  // captured as null and every consumer silently gets the no-op fallback.
  const burst = useCallback<ConfettiHandle['burst']>((origin) => {
    handle.current?.burst(origin);
  }, []);

  return (
    <ConfettiContext.Provider value={{ burst }}>
      {children}
      <Confetti ref={handle} />
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