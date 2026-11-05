'use client';

import React, { useRef } from 'react';
import { gsap, useGSAP } from '@/lib/gsap';
import { MOTION_CONFIG } from '@/lib/motion.config';

/**
 * Komponen Bento Card 3: Card Keamanan ("Aman & Tervalidasi Standar Bank")
 * Fitur gerak:
 * 1. Ikon perisai tergambar (stroke draw pada outline perisai).
 * 2. Tanda centang di dalam perisai tergambar seketika setelah perisai selesai.
 * 3. Judul dan paragraf deskripsi masuk secara berurutan (stagger).
 * 4. Dua item daftar di bawah meluncur masuk bergantian dari kiri (x: -12px -> 0, fade in).
 * 5. Titik penanda (emerald & orange) berdenyut halus sekali sebagai konfirmasi status aman aktif.
 * 6. Mematuhi preferensi prefers-reduced-motion (instan tampil tanpa gerak).
 */
export function SecurityCardDemo() {
  const rootRef = useRef<HTMLDivElement>(null);
  const shieldPathRef = useRef<SVGPathElement>(null);
  const checkPathRef = useRef<SVGPathElement>(null);
  const textGroupRef = useRef<HTMLDivElement>(null);
  const listGroupRef = useRef<HTMLDivElement>(null);
  const dot1Ref = useRef<HTMLSpanElement>(null);
  const dot2Ref = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      if (!rootRef.current) return;

      const mm = gsap.matchMedia();

      // Kasus Reduced Motion (aksesibilitas)
      mm.add(MOTION_CONFIG.mediaQueries.reducedMotion, () => {
        if (shieldPathRef.current) {
          gsap.set(shieldPathRef.current, { strokeDashoffset: 0, opacity: 1 });
        }
        if (checkPathRef.current) {
          gsap.set(checkPathRef.current, { strokeDashoffset: 0, opacity: 1 });
        }
        if (textGroupRef.current) {
          gsap.set(textGroupRef.current.children, { opacity: 1, y: 0 });
        }
        if (listGroupRef.current) {
          gsap.set(listGroupRef.current.children, { opacity: 1, x: 0 });
        }
      });

      // Kasus Motion Normal
      mm.add(MOTION_CONFIG.mediaQueries.noReducedMotion, () => {
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: rootRef.current,
            start: 'top 85%',
            once: true,
          },
        });

        // 1. Gambar outline perisai (stroke draw)
        if (shieldPathRef.current) {
          tl.fromTo(
            shieldPathRef.current,
            { strokeDasharray: 90, strokeDashoffset: 90 },
            {
              strokeDashoffset: 0,
              duration: 0.55,
              ease: MOTION_CONFIG.easings.out,
            }
          );
        }

        // 2. Gambar tanda centang di dalam perisai
        if (checkPathRef.current) {
          tl.fromTo(
            checkPathRef.current,
            { strokeDasharray: 20, strokeDashoffset: 20 },
            {
              strokeDashoffset: 0,
              duration: 0.3,
              ease: MOTION_CONFIG.easings.out,
            },
            '-=0.1'
          );
        }

        // 3. Teks judul dan paragraf masuk berurutan
        if (textGroupRef.current) {
          tl.fromTo(
            textGroupRef.current.children,
            { opacity: 0, y: 12 },
            {
              opacity: 1,
              y: 0,
              duration: MOTION_CONFIG.durations.normal,
              stagger: 0.08,
              ease: MOTION_CONFIG.easings.out,
            },
            '-=0.2'
          );
        }

        // 4. Dua item daftar meluncur dari kiri
        if (listGroupRef.current) {
          tl.fromTo(
            listGroupRef.current.children,
            { opacity: 0, x: -14 },
            {
              opacity: 1,
              x: 0,
              duration: 0.45,
              stagger: 0.12,
              ease: MOTION_CONFIG.easings.out,
              onComplete: () => {
                // 5. Titik penanda berdenyut sekali
                if (dot1Ref.current && dot2Ref.current) {
                  gsap.fromTo(
                    [dot1Ref.current, dot2Ref.current],
                    { scale: 1 },
                    {
                      scale: 1.5,
                      duration: 0.22,
                      stagger: 0.1,
                      yoyo: true,
                      repeat: 1,
                      ease: 'power2.out',
                    }
                  );
                }
              },
            },
            '-=0.15'
          );
        }
      });
    },
    { scope: rootRef }
  );

  return (
    <div
      ref={rootRef}
      className="landing-card-hover md:col-span-1 p-6 sm:p-8 flex flex-col justify-between border-b md:border-b-0 border-slate-200 space-y-6 bg-white"
    >
      <div className="space-y-4">
        {/* Shield Icon Box */}
        <div className="h-10 w-10 rounded-lg bg-orange-50 border border-orange-200 flex items-center justify-center text-brand-700 shadow-xs">
          <svg
            className="h-5 w-5 text-brand-700"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Outline Perisai */}
            <path
              ref={shieldPathRef}
              d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"
            />
            {/* Tanda Centang */}
            <path
              ref={checkPathRef}
              d="m9 12 2 2 4-4"
            />
          </svg>
        </div>

        {/* Text Area */}
        <div ref={textGroupRef} className="space-y-2">
          <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
            Catatan usaha lebih tertata
          </h3>

          <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed">
            Simpan catatan transaksi dan tinjau laporan usaha dalam satu alur.
          </p>
        </div>
      </div>

      {/* Two Security Badges List */}
      <div ref={listGroupRef} className="space-y-1.5 pt-4 border-t border-slate-200">
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <span
            ref={dot1Ref}
            className="h-1.5 w-1.5 rounded-full bg-emerald-600 origin-center shrink-0"
          />
          <span>Catatan transaksi</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <span
            ref={dot2Ref}
            className="h-1.5 w-1.5 rounded-full bg-brand-600 origin-center shrink-0"
          />
          <span>Laporan usaha</span>
        </div>
      </div>
    </div>
  );
}
