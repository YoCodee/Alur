'use client';

import { useCallback, useEffect, useRef } from 'react';
import { driver, Driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { getTourSteps } from '@/lib/tour/tour-steps';

export interface UseDashboardTourProps {
  role?: 'OWNER' | 'CASHIER';
  pathname?: string;
  autoStart?: boolean;
}

export function useDashboardTour({
  role = 'OWNER',
  pathname = '/dashboard',
  autoStart = true,
}: UseDashboardTourProps = {}) {
  const driverInstanceRef = useRef<Driver | null>(null);

  const startTour = useCallback(() => {
    if (typeof window === 'undefined') return;

    const isDashboard = pathname === '/dashboard';
    const allSteps = getTourSteps({ role, isDashboard });

    // Filter hanya elemen yang benar-benar ada di DOM saat ini
    const availableSteps = allSteps.filter((step) => {
      if (typeof step.element === 'string') {
        return !!document.querySelector(step.element);
      }
      return true;
    });

    if (availableSteps.length === 0) return;

    // Inisialisasi Driver.js dengan konfigurasi Enterprise UI
    const driverObj = driver({
      showProgress: true,
      animate: true,
      smoothScroll: true,
      allowClose: true,
      stagePadding: 6,
      stageRadius: 10,
      overlayOpacity: 0.55,
      skipMissingElement: true,
      nextBtnText: 'Lanjut',
      prevBtnText: 'Kembali',
      doneBtnText: 'Selesai ✓',
      progressText: 'Langkah {{current}} dari {{total}}',
      popoverClass: 'alur-tour-popover',
      onDestroyed: () => {
        try {
          localStorage.setItem('alur-tour-seen', 'true');
        } catch {
          // Ignore local storage error
        }
      },
    });

    driverObj.setSteps(availableSteps);
    driverInstanceRef.current = driverObj;
    driverObj.drive();
  }, [role, pathname]);

  // Autostart saat login pertama kali jika belum pernah melihat tur
  useEffect(() => {
    if (!autoStart || typeof window === 'undefined') return;

    try {
      const hasSeenTour = localStorage.getItem('alur-tour-seen');
      if (!hasSeenTour) {
        const timer = setTimeout(() => {
          startTour();
        }, 900);
        return () => clearTimeout(timer);
      }
    } catch {
      // LocalStorage tidak tersedia/akses dibatasi
    }
  }, [autoStart, startTour]);

  return {
    startTour,
  };
}
