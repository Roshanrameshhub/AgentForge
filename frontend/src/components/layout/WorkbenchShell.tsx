'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { SidebarNav } from './SidebarNav';
import { HeaderBar } from './HeaderBar';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { pageTransitionVariants } from '@/lib/motion/springs';

export function WorkbenchShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register');

  // Close mobile drawer on route transition
  useEffect(() => {
    queueMicrotask(() => {
      setIsMobileNavOpen(false);
    });
  }, [pathname]);

  if (isAuthPage) {
    return <main className="min-h-screen bg-slate-950 text-slate-100">{children}</main>;
  }

  return (
    <div className="h-screen w-screen overflow-hidden flex bg-slate-950 text-slate-100 font-sans antialiased">
      {/* Primary Sidebar Rail (with responsive mobile slide-out drawer) */}
      <SidebarNav
        isMobileOpen={isMobileNavOpen}
        onCloseMobile={() => setIsMobileNavOpen(false)}
      />

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {/* Persistent Telemetry Header with Mobile Hamburger Trigger */}
        <HeaderBar
          isMobileOpen={isMobileNavOpen}
          onToggleMobile={() => setIsMobileNavOpen(!isMobileNavOpen)}
        />

        {/* Dynamic Route Content */}
        <main className="flex-1 overflow-y-auto bg-slate-950 p-3 sm:p-4 md:p-6 min-w-0 relative">
          <ErrorBoundary>
            <AnimatePresence mode="wait">
              <motion.div
                key={pathname}
                variants={pageTransitionVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="h-full flex flex-col"
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
