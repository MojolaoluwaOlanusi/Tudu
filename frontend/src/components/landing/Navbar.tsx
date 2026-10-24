import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Menu as MenuIcon } from 'lucide-react';
import Wordmark from '../common/Wordmark';
import BrushButton from '../ui/BrushButton';
import LiveDot from './LiveDot';
import MegaMenu from './MegaMenu';
import MobileMenu from './MobileMenu';
import { MENUS, MENU_ORDER, type MenuKey } from './menu-data';

/**
 * Marketing navbar. Fixed to the top of the viewport; gains the mockup's
 * frosted-glass background once the page is scrolled (> 8 px) so hero copy
 * reads cleanly against it.
 *
 * The open menu and the mobile drawer are both closed on route change — a
 * menu item that navigates must not leave its panel hanging over the new
 * page.
 */
const Navbar: React.FC = () => {
  const [openMenu, setOpenMenu] = useState<MenuKey | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const closeTimer = useRef<number | null>(null);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setOpenMenu(null);
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(
    () => () => {
      if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    },
    [],
  );

  const scheduleClose = () => {
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setOpenMenu(null), 150);
  };
  const cancelClose = () => {
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  return (
    <>
      <AnimatePresence>
        {openMenu && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-30 bg-black/30 backdrop-blur-[2px]"
            onClick={() => setOpenMenu(null)}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      <header
        className={
          'fixed inset-x-0 top-0 z-40 transition-colors duration-200 ' +
          (scrolled ? 'glass border-b border-line-subtle' : '')
        }
      >
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-6">
          <Link to="/" className="shrink-0" aria-label="Tudu home">
            <Wordmark size="sm" />
          </Link>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
            {MENU_ORDER.map((key) => {
              const menu = MENUS[key];
              const isOpen = openMenu === key;
              return (
                <div
                  key={key}
                  className="relative"
                  onMouseEnter={() => {
                    cancelClose();
                    setOpenMenu(key);
                  }}
                  onMouseLeave={scheduleClose}
                >
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-haspopup="true"
                    className={
                      'flex items-center gap-1 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors ' +
                      (isOpen
                        ? 'bg-raised text-ink'
                        : 'text-ink-muted hover:bg-raised hover:text-ink')
                    }
                  >
                    {menu.label}
                    <ChevronDown
                      className={
                        'h-3 w-3 transition-transform ' + (isOpen ? 'rotate-180' : '')
                      }
                    />
                  </button>
                  <MegaMenu
                    menu={menu}
                    isOpen={isOpen}
                    onClose={() => setOpenMenu(null)}
                  />
                </div>
              );
            })}
            <Link
              to="/pricing"
              className="rounded-md px-3 py-1.5 text-[13px] font-medium text-ink-muted transition-colors hover:bg-raised hover:text-ink"
            >
              Pricing
            </Link>
          </nav>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <div className="hidden lg:block">
              <LiveDot />
            </div>
            <Link
              to="/login"
              className="rounded-md px-2 py-1.5 text-[13px] font-medium text-ink-muted transition-colors hover:text-ink sm:px-3"
            >
              Sign in
            </Link>
            <Link to="/login">
              <BrushButton size="sm">Start free</BrushButton>
            </Link>
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              className="rounded-md p-2 text-ink-muted transition-colors hover:bg-subtle hover:text-ink lg:hidden"
            >
              <MenuIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <MobileMenu open={mobileOpen} onClose={() => setMobileOpen(false)} />
    </>
  );
};

export default Navbar;