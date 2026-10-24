import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MENUS, MENU_ORDER, type MenuKey } from './menu-data';
import BrushButton from '../ui/BrushButton';
import LiveDot from './LiveDot';

interface MobileMenuProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Full-screen mobile menu (visible below the `lg` breakpoint). Section
 * collapse state resets when the menu closes, matching the mockup:
 * reopening always starts at the top-level list.
 *
 * The body is locked while open so a swipe inside the menu does not scroll
 * the underlying landing page.
 */
const MobileMenu: React.FC<MobileMenuProps> = ({ open, onClose }) => {
  const [expanded, setExpanded] = useState<MenuKey | null>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    if (!open) setExpanded(null);
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-50 flex flex-col bg-canvas lg:hidden"
        >
          <div className="flex h-14 items-center justify-between border-b border-line-subtle px-6">
            <span className="font-brand text-2xl leading-none text-ink">tudu</span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close menu"
              className="rounded-md p-2 text-ink-muted transition-colors hover:bg-subtle hover:text-ink"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-6">
            {MENU_ORDER.map((key) => {
              const menu = MENUS[key];
              const isOpen = expanded === key;
              return (
                <div key={key} className="border-b border-line-subtle last:border-0">
                  <button
                    type="button"
                    onClick={() => setExpanded(isOpen ? null : key)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center justify-between py-4 text-left"
                  >
                    <span className="text-base font-medium text-ink">{menu.label}</span>
                    <ChevronDown
                      className={
                        'h-4 w-4 text-ink-muted transition-transform ' +
                        (isOpen ? 'rotate-180' : '')
                      }
                    />
                  </button>
                  {isOpen && (
                    <div className="space-y-4 pb-4">
                      {menu.columns.map((col) => (
                        <div key={col.heading}>
                          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-ink-faint">
                            {col.heading}
                          </p>
                          <ul className="space-y-1">
                            {col.items.map((item) => {
                              const Icon = item.icon;
                              return (
                                <li key={item.title}>
                                  <Link
                                    to={item.href}
                                    onClick={onClose}
                                    className="flex items-start gap-3 rounded-md p-2 hover:bg-raised"
                                  >
                                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-line-subtle bg-raised text-ink-muted">
                                      <Icon className="h-3.5 w-3.5" />
                                    </span>
                                    <span className="min-w-0">
                                      <span className="block text-[13px] font-medium text-ink">
                                        {item.title}
                                        {item.comingSoon && (
                                          <span className="ml-1.5 rounded-sm bg-line-subtle px-1 text-[9px] font-semibold uppercase tracking-wider text-ink-faint">
                                            Soon
                                          </span>
                                        )}
                                      </span>
                                      <span className="block text-[11px] text-ink-muted">
                                        {item.description}
                                      </span>
                                    </span>
                                  </Link>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            <Link
              to="/pricing"
              onClick={onClose}
              className="block border-b border-line-subtle py-4 text-base font-medium text-ink"
            >
              Pricing
            </Link>
            <div className="mt-6">
              <LiveDot />
            </div>
            <div className="mt-8 flex flex-col gap-3">
              <Link to="/login" onClick={onClose}>
                <button
                  type="button"
                  className="w-full rounded-md border border-line px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-subtle"
                >
                  Sign in
                </button>
              </Link>
              <Link to="/login" onClick={onClose}>
                <BrushButton className="w-full">Start free</BrushButton>
              </Link>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MobileMenu;