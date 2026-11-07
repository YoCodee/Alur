'use client';

import { useCallback, useEffect, useRef } from 'react';
import { driver, Driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { getTourSteps } from '@/lib/tour/tour-steps';

export interface UseDashboardTourProps {
  role?: 'OWNER' | 'CASHIER';
  pathname?: string;
  autoStart?: boolean;
  /** ID user login — panduan sekali jalan per user (bukan per browser). */
  userKey?: string;
}

export function useDashboardTour({
  role = 'OWNER',
  pathname = '/dashboard',
  autoStart = true,
  userKey,
}: UseDashboardTourProps = {}) {
  const driverInstanceRef = useRef<Driver | null>(null);

  // Flag "sudah pernah melihat panduan" harus per user: browser yang sudah
  // dipakai user lain (mis. setelah menguji akun demo) tetap memberi panduan
  // segar ke user baru yang mendaftar di browser yang sama.
  const storageKey = `alur-tour-seen:${userKey ?? 'anon'}`;

  const markSeen = useCallback(() => {
    try {
      localStorage.setItem(storageKey, 'true');
    } catch {
      // Ignore local storage error
    }
  }, [storageKey]);

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

    // Tutup panduan yang masih aktif agar tidak ada dua overlay tumpang tindih
    driverInstanceRef.current?.destroy();

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
      // Tandai "sudah dilihat" di onDestroyStarted: onDestroyed hanya dipanggil
      // setelah transisi driver.js selesai, sehingga close <400ms tak tercatat.
      onDestroyStarted: () => {
        markSeen();
        // onDestroyStarted menghentikan destroy (deferred) — konfirmasi manual
        driverInstanceRef.current?.destroy();
      },
      onDestroyed: () => {
        markSeen();
      },
    });

    driverObj.setSteps(availableSteps);
    driverInstanceRef.current = driverObj;
    driverObj.drive();
  }, [role, pathname, markSeen]);

  // Autostart saat login pertama kali jika belum pernah melihat tur.
  // Menunggu user teridentifikasi (userKey) agar key penyimpanan sudah benar
  // dan peran yang dibaca sudah dari profil, bukan default.
  useEffect(() => {
    if (!autoStart || !userKey || typeof window === 'undefined') return;

    try {
      const hasSeenTour = localStorage.getItem(storageKey);
      if (!hasSeenTour) {
        const timer = setTimeout(() => {
          startTour();
        }, 900);
        return () => clearTimeout(timer);
      }
    } catch {
      // LocalStorage tidak tersedia/akses dibatasi
    }
  }, [autoStart, userKey, storageKey, startTour]);

  // Bersihkan instance saat komponen unmount
  useEffect(() => {
    return () => {
      driverInstanceRef.current?.destroy();
    };
  }, []);

  return {
    startTour,
  };
}
