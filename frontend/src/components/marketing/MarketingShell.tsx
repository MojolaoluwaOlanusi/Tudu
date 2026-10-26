import React from 'react';
import Navbar from '../landing/Navbar';
import Footer from '../landing/Footer';

interface MarketingShellProps {
  children: React.ReactNode;
}

/**
 * Wraps any public marketing page with the landing Navbar and Footer,
 * so every public route (docs, blog, changelog, legal, ...) shares the
 * same chrome. The nav and footer are the same components used by the
 * landing page, so a fix to either propagates everywhere.
 */
const MarketingShell: React.FC<MarketingShellProps> = ({ children }) => (
  <div className="min-h-screen bg-canvas">
    <Navbar />
    <main className="pt-14">{children}</main>
    <Footer />
  </div>
);

export default MarketingShell;