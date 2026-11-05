'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  ALUR_SVG_VIEWBOX,
  ALUR_PATH_RIBBON_OUTER,
  ALUR_PATH_RIBBON_INNER,
  ALUR_DEPTH_PATHS,
} from './alur-logo-paths';

export interface AlurSplashScreenProps {
  /**
   * Durasi total sebelum splash screen mulai memudar (default: 3400ms)
   */
  durationMs?: number;
  /**
   * Jika true, hanya akan ditampilkan sekali per session browser (default: false)
   */
  oncePerSession?: boolean;
  /**
   * Callback saat animasi selesai & splash screen mulai menutup
   */
  onFinish?: () => void;
}

/**
 * Modern Animated Splash Screen untuk Alur
 * Sesuai spesifikasi:
 * A. Stroke reveal: Ikon digambar mengikuti garis path (stroke-dasharray) dari kiri bawah ke puncak & memutari loop.
 * B. Fill & Shadow transition: Warna gradasi oranye & bayangan lipatan 3D muncul secara halus (fade-in + scale pop).
 * C. Text reveal: Teks "alur" muncul dengan efek fade-in + slide dari bawah setelah ikon terbentuk.
 * D. Easing modern (cubic-bezier), durasi total 1.5 - 2 detik dengan latar belakang putih bersih.
 */
export function AlurSplashScreen({
  durationMs = 3400,
  oncePerSession = false,
  onFinish,
}: AlurSplashScreenProps) {
  // Status tahapan animasi:
  // 0: Initial (hidden / preparing)
  // 1: Stroke drawing (80 - 1180ms)
  // 2: Fill & 3D shadow transition (1250ms - 1950ms)
  // 3: Text reveal (1900ms - 2600ms)
  // 4: Exiting / Fade out (3400 - 4100ms)
  // 5: Unmounted
  const [phase, setPhase] = useState<number>(0);
  const [visible, setVisible] = useState<boolean>(true);

  // SVG Path lengths untuk stroke-dasharray akurat
  const [outerLength, setOuterLength] = useState<number>(2200);
  const [innerLength, setInnerLength] = useState<number>(900);

  const outerStrokeRef = useRef<SVGPathElement>(null);
  const innerStrokeRef = useRef<SVGPathElement>(null);

  const dismissImmediately = useCallback(() => {
    setPhase(4);
    onFinish?.();
    setTimeout(() => setVisible(false), 700);
  }, [onFinish]);

  useEffect(() => {
    // Cek sessionStorage jika oncePerSession diaktifkan
    if (oncePerSession && typeof window !== 'undefined') {
      const alreadyShown = window.sessionStorage.getItem('alur_splash_seen');
      if (alreadyShown) {
        setVisible(false);
        onFinish?.();
        return;
      }
      window.sessionStorage.setItem('alur_splash_seen', 'true');
    }

    // Ukur panjang path SVG riil
    if (outerStrokeRef.current) {
      try {
        const len = outerStrokeRef.current.getTotalLength();
        if (len > 0) setOuterLength(Math.ceil(len));
      } catch {
        // Fallback ke 2200
      }
    }
    if (innerStrokeRef.current) {
      try {
        const len = innerStrokeRef.current.getTotalLength();
        if (len > 0) setInnerLength(Math.ceil(len));
      } catch {
        // Fallback ke 900
      }
    }

    // Mulai animasi
    // 1. Frame awal: trigger stroke reveal
    const t0 = setTimeout(() => {
      setPhase(1);
    }, 80);

    // 2. Tahap B: Fill & 3D shadows fade-in + micro scale pop
    const t1 = setTimeout(() => {
      setPhase(2);
    }, 1250);

    // 3. Tahap C: Teks "alur" slide-in + fade-in
    const t2 = setTimeout(() => {
      setPhase(3);
    }, 1900);

    // 4. Tahap D: Fade out background putih
    const t3 = setTimeout(() => {
      setPhase(4);
      onFinish?.();
    }, durationMs);

    // 5. Unmount dari DOM setelah transisi keluar selesai
    const t4 = setTimeout(() => {
      setVisible(false);
    }, durationMs + 750);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        dismissImmediately();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(t0);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [durationMs, oncePerSession, onFinish, dismissImmediately]);

  if (!visible) return null;

  // Nilai status visual berdasarkan tahapan
  const isStrokeActive = phase >= 1;
  const isFillActive = phase >= 2;
  const isTextActive = phase >= 3;
  const isExiting = phase >= 4;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Memuat aplikasi Alur"
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-white select-none transition-opacity duration-700 ease-in-out ${
        isExiting ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{
        // Pastikan background putih bersih menutupi layar sepenuhnya
        backgroundColor: '#FFFFFF',
      }}
    >
      {/* Kontainer Animasi Utama */}
      <div className="flex flex-col items-center justify-center px-4">
        {/* Ikon Alur SVG dengan Lapisan Animasi */}
        <div
          className={`relative flex items-center justify-center transition-transform duration-700 ${
            isFillActive ? 'scale-100' : 'scale-95'
          }`}
          style={{
            width: 140,
            height: 140,
            transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox={ALUR_SVG_VIEWBOX}
            width="100%"
            height="100%"
            className="overflow-visible"
            aria-hidden="true"
          >
            <defs>
              {/* Gradasi Oranye Utama */}
              <linearGradient id="splashIconOrange" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FF7A00" />
                <stop offset="50%" stopColor="#FF5A00" />
                <stop offset="100%" stopColor="#EF4900" />
              </linearGradient>

              {/* Gradasi Lipatan Gelap (3D Depth) */}
              <linearGradient id="splashIconOrangeDark" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#D84E00" />
                <stop offset="100%" stopColor="#B83A00" />
              </linearGradient>

              {/* Clip Path untuk bayangan 3D */}
              <clipPath id="splashIconClip">
                <path d={ALUR_PATH_RIBBON_OUTER} />
                <path d={ALUR_PATH_RIBBON_INNER} />
              </clipPath>
            </defs>

            {/* ======================================================== */}
            {/* TAHAP A: STROKE REVEAL (Garis digambar dari kiri bawah) */}
            {/* ======================================================== */}
            <g
              id="splash-stroke-layer"
              fill="none"
              stroke="#FF5A00"
              strokeWidth="10"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-opacity duration-300"
              style={{
                opacity: isFillActive ? 0 : 1,
              }}
            >
              {/* Outer Ribbon Stroke */}
              <path
                ref={outerStrokeRef}
                d={ALUR_PATH_RIBBON_OUTER}
                strokeDasharray={outerLength}
                strokeDashoffset={isStrokeActive ? 0 : outerLength}
                style={{
                  transition: 'stroke-dashoffset 1100ms cubic-bezier(0.22, 1, 0.36, 1)',
                }}
              />

              {/* Inner Loop Ribbon Stroke (Sedikit delay agar estetik) */}
              <path
                ref={innerStrokeRef}
                d={ALUR_PATH_RIBBON_INNER}
                strokeDasharray={innerLength}
                strokeDashoffset={isStrokeActive ? 0 : innerLength}
                style={{
                  transition: 'stroke-dashoffset 1050ms cubic-bezier(0.22, 1, 0.36, 1) 100ms',
                }}
              />
            </g>

            {/* ======================================================== */}
            {/* TAHAP B: FILL & 3D SHADOW TRANSITION (Fade-in + Scale Pop) */}
            {/* ======================================================== */}
            <g
              id="splash-fill-layer"
              className="transition-opacity duration-700 ease-out"
              style={{
                opacity: isFillActive ? 1 : 0,
              }}
            >
              {/* Ribbon Base Layer dengan Gradasi Oranye */}
              <g id="splash-ribbon-base" fill="url(#splashIconOrange)">
                <path d={ALUR_PATH_RIBBON_OUTER} />
                <path d={ALUR_PATH_RIBBON_INNER} />
              </g>

              {/* 3D Depth Shadows (Lipatan Realistis) */}
              <g
                id="splash-ribbon-depth"
                clipPath="url(#splashIconClip)"
                fill="url(#splashIconOrangeDark)"
                className="transition-opacity duration-300"
                style={{
                  opacity: isFillActive ? 0.95 : 0,
                }}
              >
                {ALUR_DEPTH_PATHS.map((d, index) => (
                  <path key={index} d={d} />
                ))}
              </g>
            </g>
          </svg>
        </div>

        {/* ======================================================== */}
        {/* TAHAP C: TEXT REVEAL ("alur" dengan slide + fade-in) */}
        {/* ======================================================== */}
        <div
          className="mt-6 flex flex-col items-center transition-all duration-700"
          style={{
            opacity: isTextActive ? 1 : 0,
            transform: isTextActive ? 'translateY(0px)' : 'translateY(12px)',
            transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        >
          {/* Tipografi "alur" menggunakan font Plus Jakarta Sans */}
          <div className="flex items-center gap-2">
            <h1 className="font-sans text-4xl font-extrabold tracking-tight text-stone-900 sm:text-5xl">
              alur
            </h1>
            <span className="rounded-md border border-orange-200/80 bg-orange-50 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-orange-700">
              POS
            </span>
          </div>

          <p className="mt-2 text-center text-xs font-medium text-stone-500 sm:text-sm">
            Platform Audit &amp; Smart Voice POS UMKM
          </p>

          {/* Subtitle / Loading dots halus */}
          <div className="mt-4 flex items-center gap-1.5">
            <span
              className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse"
              style={{ animationDelay: '0ms' }}
            />
            <span
              className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse"
              style={{ animationDelay: '150ms' }}
            />
            <span
              className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse"
              style={{ animationDelay: '300ms' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default AlurSplashScreen;
