'use client';

import React, { useRef } from 'react';
import { gsap, useGSAP } from '@/lib/gsap';
import { MOTION_CONFIG } from '@/lib/motion.config';

/**
 * Komponen pembungkus animasi Section Hero:
 * Menganimasikan elemen bertingkat dengan urutan elegan saat halaman dimuat:
 * 1. Announcement Pill Badge
 * 2. Headline H1 Display Masif
 * 3. Subtitle Paragraf
 * 4. CTA Buttons Row
 * 5. Trust Ticker Badges
 *
 * Menggunakan kelas selektor '.hero-animate-item' agar struktur dan konten HTML
 * tetap utuh dirender di server untuk SEO dan aksesibilitas maksimal.
 */
export function HeroMotion({ children }: { children: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!containerRef.current) return;

      const mm = gsap.matchMedia();

      // Kasus Reduced Motion (aksesibilitas)
      mm.add(MOTION_CONFIG.mediaQueries.reducedMotion, () => {
        const items = containerRef.current?.querySelectorAll('.hero-animate-item');
        if (items) {
          gsap.set(items, { opacity: 1, y: 0, clearProps: 'all' });
        }
      });

      // Kasus Normal Motion
      mm.add(MOTION_CONFIG.mediaQueries.noReducedMotion, () => {
        const items = containerRef.current?.querySelectorAll('.hero-animate-item');
        if (!items || items.length === 0) return;

        gsap.fromTo(
          items,
          {
            opacity: 0,
            y: MOTION_CONFIG.distances.md,
          },
          {
            opacity: 1,
            y: 0,
            duration: MOTION_CONFIG.durations.normal,
            stagger: 0.1,
            ease: MOTION_CONFIG.easings.out,
            delay: 0.1,
          }
        );
      });
    },
    { scope: containerRef }
  );

  return (
    <div ref={containerRef} className="w-full">
      {children}
    </div>
  );
}
