import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Menu } from './menu-data';

interface MegaMenuProps {
  menu: Menu;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Desktop mega menu panel that drops under a navbar trigger.
 *
 * Closes 150 ms after the mouse leaves both the trigger and the panel, so
 * the diagonal between them does not accidentally dismiss it. The close
 * timer is cleared on unmount so a page that navigates away cannot fire a
 * stale `onClose` against a torn-down tree.
 */
const MegaMenu: React.FC<MegaMenuProps> = ({ menu, isOpen, onClose }) => {
  const closeTimer = useRef<number | null>(null);

  const scheduleClose = () => {
    closeTimer.current = window.setTimeout(onClose, 150);
  };
  const cancelClose = () => {
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  useEffect(() => () => cancelClose(), []);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.98 }}
          transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
          className="absolute left-0 top-full mt-3 overflow-hidden rounded-lg border border-line bg-surface shadow-2xl"
          style={{ minWidth: menu.columns.length > 1 ? 640 : 340 }}
        >
          <div
            className="grid"
            style={{
              gridTemplateColumns: 'repeat(' + menu.columns.length + ', minmax(0, 1fr))',
            }}
          >
            {menu.columns.map((col, i) => (
              <div
                key={col.heading}
                className={
                  'p-4 ' +
                  (col.highlight ? 'bg-brand-subtle ' : '') +
                  (i > 0 ? 'border-l border-line-subtle' : '')
                }
              >
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-ink-faint">
                  {col.heading}
                </p>
                <ul className="-mx-2 space-y-0.5">
                  {col.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <li key={item.title}>
                        <Link
                          to={item.href}
                          onClick={onClose}
                          className="flex items-start gap-3 rounded-md px-2 py-2 transition-colors hover:bg-raised"
                        >
                          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-line-subtle bg-raised text-ink-muted">
                            <Icon className="h-3.5 w-3.5" />
                          </span>
                          <span className="min-w-0">
                            <span className="flex items-center gap-1.5 text-[13px] font-medium text-ink">
                              {item.title}
                              {item.comingSoon && (
                                <span className="rounded-sm bg-line-subtle px-1 text-[9px] font-semibold uppercase tracking-wider text-ink-faint">
                                  Soon
                                </span>
                              )}
                            </span>
                            <span className="block truncate text-[11px] text-ink-muted">
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
          {menu.footer && (
            <Link
              to={menu.footer.href}
              onClick={onClose}
              className="flex items-center justify-between border-t border-line-subtle px-4 py-3 text-xs font-medium text-ink-muted transition-colors hover:bg-raised hover:text-ink"
            >
              <span>{menu.footer.label}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MegaMenu;