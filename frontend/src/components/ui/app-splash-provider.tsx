'use client';

import React, { useState, useEffect } from 'react';
import { AlurSplashScreen } from './alur-splash-screen';

/**
 * AppSplashProvider manages the initial splash screen for the application.
 * It displays on the first visit of a session, and can also be triggered
 * programmatically via `window.dispatchEvent(new CustomEvent('alur:show-splash'))`.
 */
export function AppSplashProvider({ children }: { children: React.ReactNode }) {
  const [showSplash, setShowSplash] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Cek apakah sudah pernah dilihat di session ini atau ada query ?splash=true
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const forceSplash = urlParams.get('splash') === 'true' || urlParams.get('splash') === '1';
      const seen = window.sessionStorage.getItem('alur_splash_seen');

      if (!seen || forceSplash) {
        setShowSplash(true);
      }

      // Handler untuk trigger manual
      const handleShowSplash = () => setShowSplash(true);
      window.addEventListener('alur:show-splash', handleShowSplash);
      return () => window.removeEventListener('alur:show-splash', handleShowSplash);
    }
  }, []);

  return (
    <>
      {mounted && showSplash && (
        <AlurSplashScreen
          oncePerSession={false}
          durationMs={3400}
          onFinish={() => {
            if (typeof window !== 'undefined') {
              window.sessionStorage.setItem('alur_splash_seen', 'true');
            }
          }}
        />
      )}
      {children}
    </>
  );
}

export default AppSplashProvider;
