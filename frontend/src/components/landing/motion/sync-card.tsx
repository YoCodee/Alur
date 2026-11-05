'use client';

import React, { useRef } from 'react';
import { Globe2 } from 'lucide-react';
import { gsap, useGSAP, ScrollTrigger } from '@/lib/gsap';
import { MOTION_CONFIG } from '@/lib/motion.config';

/**
 * Komponen Bento Card 2: Card Oranye ("Satu Platform untuk POS, Stok, dan Keuangan")
 * Fitur gerak:
 * 1. Kemunculan berurutan (reveal once): Ikon -> Judul -> Paragraf -> Garis -> Metrik
 * 2. Ikon bola dunia (Globe2) mengapung naik-turun sangat pelan (maks 3.5px, sine ease)
 * 3. Garis pemisah horizontal tergambar dari kiri ke kanan (scaleX: 0 -> 1)
 * 4. Titik sinyal data bergerak dari kiri ke kanan di antara teks "Sinkronisasi instan" dan "< 100ms"
 * 5. Kilau gradasi (shimmer) menyapu pelan di latar oranye
 * 6. Otomatis pause saat card berada di luar viewport layar
 * 7. Mematuhi preferensi prefers-reduced-motion
 */
export function SyncCardDemo() {
  const rootRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLDivElement>(null);
  const textGroupRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const metricRef = useRef<HTMLSpanElement>(null);
  const shimmerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!rootRef.current) return;

      const mm = gsap.matchMedia();

      // Kasus Reduced Motion (aksesibilitas)
      mm.add(MOTION_CONFIG.mediaQueries.reducedMotion, () => {
        if (shimmerRef.current) gsap.set(shimmerRef.current, { display: 'none' });
        if (dotRef.current) gsap.set(dotRef.current, { opacity: 0 });
        if (lineRef.current) gsap.set(lineRef.current, { scaleX: 1 });
        if (iconRef.current) gsap.set(iconRef.current, { y: 0 });
        if (textGroupRef.current) gsap.set(textGroupRef.current.children, { opacity: 1, y: 0 });
        if (metricRef.current) gsap.set(metricRef.current, { opacity: 1 });
      });

      // Kasus Motion Normal
      mm.add(MOTION_CONFIG.mediaQueries.noReducedMotion, () => {
        // 1. Entrance Reveal (Sekali saja saat masuk viewport)
        const entranceTl = gsap.timeline({
          scrollTrigger: {
            trigger: rootRef.current,
            start: 'top 85%',
            once: true,
          },
        });

        if (textGroupRef.current) {
          entranceTl.fromTo(
            textGroupRef.current.children,
            { opacity: 0, y: 12 },
            {
              opacity: 1,
              y: 0,
              duration: MOTION_CONFIG.durations.normal,
              stagger: 0.08,
              ease: MOTION_CONFIG.easings.out,
            }
          );
        }

        if (lineRef.current) {
          entranceTl.fromTo(
            lineRef.current,
            { scaleX: 0 },
            {
              scaleX: 1,
              duration: 0.5,
              ease: MOTION_CONFIG.easings.out,
            },
            '-=0.2'
          );
        }

        if (metricRef.current) {
          entranceTl.fromTo(
            metricRef.current,
            { opacity: 0, x: 6 },
            {
              opacity: 1,
              x: 0,
              duration: 0.4,
              ease: MOTION_CONFIG.easings.out,
            },
            '-=0.2'
          );
        }

        // 2. Timeline Loop untuk Elemen Hidup (Floating icon, moving dot, subtle shimmer)
        const loopTl = gsap.timeline({
          repeat: -1,
          paused: true,
        });

        // 2a. Floating icon naik-turun halus (3.5px)
        if (iconRef.current) {
          gsap.to(iconRef.current, {
            y: -3.5,
            duration: 2.6,
            ease: 'sine.inOut',
            yoyo: true,
            repeat: -1,
          });
        }

        // 2b. Shimmer halus menyapu latar belakang setiap interval
        if (shimmerRef.current) {
          gsap.fromTo(
            shimmerRef.current,
            { x: '-150%' },
            {
              x: '350%',
              duration: 2.4,
              ease: 'power2.inOut',
              repeat: -1,
              repeatDelay: 5.5,
            }
          );
        }

        // 2c. Titik sinyal bergerak di jalur data
        if (dotRef.current) {
          loopTl.fromTo(
            dotRef.current,
            { left: '0%', opacity: 0, scale: 0.7 },
            {
              left: '96%',
              opacity: 1,
              scale: 1,
              duration: 1.5,
              ease: 'power2.out',
            }
          );
          loopTl.to(
            dotRef.current,
            {
              opacity: 0,
              scale: 0.8,
              duration: 0.25,
            },
            '+=0.1'
          );
          loopTl.to({}, { duration: 1.8 }); // jeda sebelum sinyal berikutnya
        }

        // 3. ScrollTrigger Pause/Play saat card masuk/keluar layar
        const st = ScrollTrigger.create({
          trigger: rootRef.current,
          start: 'top bottom',
          end: 'bottom top',
          onToggle: (self) => {
            if (self.isActive) {
              loopTl.play();
            } else {
              loopTl.pause();
            }
          },
        });

        return () => {
          st.kill();
          loopTl.kill();
        };
      });
    },
    { scope: rootRef }
  );

  return (
    <div
      ref={rootRef}
      className="landing-card-hover relative overflow-hidden md:col-span-1 p-6 sm:p-8 flex flex-col justify-between bg-hero-gradient text-white border-b md:border-b md:border-l border-brand-500/30 space-y-6 shadow-inner"
    >
      {/* Subtle Shimmer Sheen di latar belakang */}
      <div
        ref={shimmerRef}
        aria-hidden="true"
        className="absolute inset-y-0 -left-1/2 w-1/2 bg-gradient-to-r from-transparent via-white/12 to-transparent pointer-events-none -skew-x-12 select-none"
      />

      <div ref={textGroupRef} className="space-y-4 relative z-10">
        <div
          ref={iconRef}
          className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center text-white backdrop-blur-xs origin-center shadow-xs"
        >
          <Globe2 className="h-5 w-5" />
        </div>

        <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight leading-snug">
          Transaksi dan stok dalam satu tempat
        </h3>

        <p className="text-xs sm:text-[13px] text-white/90 leading-relaxed">
          Catat pesanan, pantau persediaan, dan tinjau laporan usaha dari satu aplikasi.
        </p>
      </div>

      <div className="relative z-10 pt-4 space-y-3">
        {/* Animated Horizontal Divider Line */}
        <div
          ref={lineRef}
          aria-hidden="true"
          className="w-full h-px bg-white/25 origin-left"
        />

        {/* Process Indicator Row */}
        <div className="flex items-center justify-between text-[11px] text-white/80 font-mono">
          <span className="shrink-0">Informasi usaha</span>

          {/* Sinyal Jalur Data Beranimasi */}
          <div
            aria-hidden="true"
            className="relative flex-1 mx-3 h-2 flex items-center overflow-hidden"
          >
            <div className="w-full h-px bg-white/15" />
            <div
              ref={dotRef}
              className="absolute top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-white shadow-xs shadow-white/80 pointer-events-none opacity-0"
            />
          </div>

          <span ref={metricRef} className="font-bold text-white shrink-0">
            Terhubung
          </span>
        </div>
      </div>
    </div>
  );
}
