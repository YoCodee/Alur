'use client';

import React, { useRef, useState } from 'react';
import { Activity, CheckCircle2 } from 'lucide-react';
import { gsap, useGSAP, ScrollTrigger } from '@/lib/gsap';
import { MOTION_CONFIG } from '@/lib/motion.config';

/**
 * Komponen Bento Card 4: Terminal Anomali ("Deteksi Dini Masalah Operasional")
 * Timeline GSAP loop berulang ±9.5 detik:
 * 1. Baris "Menjalankan mesin anomali Alur..." muncul dengan efek visual mengetik (clip-path mask)
 * 2. Baris "3 modul pengawasan aktif" muncul, titik status berdenyut
 * 3. Tiga sub-baris anomali masuk berurutan (stagger)
 * 4. Baris perintah di bawah mengetik, kursor berkedip, tombol "Eksekusi" tampil efek ditekan (scale: 1 -> 0.94 -> 1)
 * 5. Muncul konfirmasi "2 mutasi dikirim ke dashboard" & tombol berubah jadi "Terkirim ✓" (tahan ±2.5s)
 * 6. Fade out halus, lalu loop kembali ke awal
 *
 * Aksesibilitas & SEO:
 * - Teks tetap ada utuh di DOM (tidak dihapus/ditulis ulang via JS).
 * - Mendukung prefers-reduced-motion (tampilan statis instan).
 * - Otomatis PAUSE saat card keluar dari viewport layar.
 */
export function AnomalyTerminalDemo() {
  const rootRef = useRef<HTMLDivElement>(null);
  const leftColRef = useRef<HTMLDivElement>(null);

  // Terminal DOM element refs
  const consoleBoxRef = useRef<HTMLDivElement>(null);
  const line1Ref = useRef<HTMLParagraphElement>(null);
  const line2Ref = useRef<HTMLParagraphElement>(null);
  const pulseDotRef = useRef<HTMLSpanElement>(null);
  const subRowsRef = useRef<HTMLDivElement>(null);
  const commandTextRef = useRef<HTMLSpanElement>(null);
  const cursorRef = useRef<HTMLSpanElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const commandRowRef = useRef<HTMLDivElement>(null);
  const confirmedRowRef = useRef<HTMLDivElement>(null);

  // State untuk interaktivitas manual pengguna
  const [manualExecuted, setManualExecuted] = useState<boolean | null>(null);

  useGSAP(
    () => {
      if (!rootRef.current) return;

      const mm = gsap.matchMedia();

      // Kasus Reduced Motion (aksesibilitas)
      mm.add(MOTION_CONFIG.mediaQueries.reducedMotion, () => {
        if (leftColRef.current) gsap.set(leftColRef.current.children, { opacity: 1, y: 0 });
        if (line1Ref.current) gsap.set(line1Ref.current, { clipPath: 'inset(0 0% 0 0)', opacity: 1 });
        if (line2Ref.current) gsap.set(line2Ref.current, { opacity: 1, y: 0 });
        if (subRowsRef.current) gsap.set(subRowsRef.current.children, { opacity: 1, y: 0 });
        if (commandRowRef.current) gsap.set(commandRowRef.current, { display: 'none' });
        if (confirmedRowRef.current) gsap.set(confirmedRowRef.current, { display: 'flex', opacity: 1 });
        if (buttonRef.current) {
          buttonRef.current.innerText = 'Selesai ✓';
          buttonRef.current.className = 'px-2.5 py-1 text-xs font-bold rounded-sm transition-colors cursor-pointer shrink-0 bg-emerald-600 text-white';
        }
      });

      // Kasus Normal Motion
      mm.add(MOTION_CONFIG.mediaQueries.noReducedMotion, () => {
        // Entrance reveal untuk kolom kiri teks
        if (leftColRef.current) {
          gsap.fromTo(
            leftColRef.current.children,
            { opacity: 0, y: 12 },
            {
              opacity: 1,
              y: 0,
              duration: MOTION_CONFIG.durations.normal,
              stagger: 0.08,
              ease: MOTION_CONFIG.easings.out,
              scrollTrigger: {
                trigger: rootRef.current,
                start: 'top 85%',
                once: true,
              },
            }
          );
        }

        // Timeline Loop Terminal ±9.5 detik
        const loopTl = gsap.timeline({
          repeat: -1,
          paused: true,
        });

        // Setup awal setiap iterasi
        loopTl.add(() => {
          if (line1Ref.current) gsap.set(line1Ref.current, { clipPath: 'inset(0 100% 0 0)', opacity: 1 });
          if (line2Ref.current) gsap.set(line2Ref.current, { opacity: 0, y: 6 });
          if (subRowsRef.current) gsap.set(subRowsRef.current.children, { opacity: 0, y: 6 });
          if (commandTextRef.current) gsap.set(commandTextRef.current, { clipPath: 'inset(0 100% 0 0)', opacity: 1 });
          if (commandRowRef.current) gsap.set(commandRowRef.current, { display: 'flex', opacity: 1 });
          if (confirmedRowRef.current) gsap.set(confirmedRowRef.current, { display: 'none', opacity: 0 });
          if (buttonRef.current) {
            buttonRef.current.innerText = 'Tinjau';
            buttonRef.current.className = 'px-2.5 py-1 text-xs font-bold rounded-sm transition-colors cursor-pointer shrink-0 bg-brand-600 text-white';
          }
          if (consoleBoxRef.current) gsap.set(consoleBoxRef.current, { opacity: 1 });
        });

        // 1. Efek mengetik baris 1
        if (line1Ref.current) {
          loopTl.to(line1Ref.current, {
            clipPath: 'inset(0 0% 0 0)',
            duration: 0.9,
            ease: 'none',
          });
        }

        // 2. Baris 2 muncul + denyut titik status
        if (line2Ref.current) {
          loopTl.to(
            line2Ref.current,
            {
              opacity: 1,
              y: 0,
              duration: 0.35,
              ease: MOTION_CONFIG.easings.out,
            },
            '+=0.1'
          );
        }

        if (pulseDotRef.current) {
          loopTl.fromTo(
            pulseDotRef.current,
            { scale: 1 },
            {
              scale: 1.4,
              duration: 0.22,
              repeat: 2,
              yoyo: true,
              ease: 'power2.out',
            },
            '-=0.2'
          );
        }

        // 3. Tiga sub-baris anomali masuk berurutan
        if (subRowsRef.current) {
          loopTl.to(
            subRowsRef.current.children,
            {
              opacity: 1,
              y: 0,
              duration: 0.35,
              stagger: 0.16,
              ease: MOTION_CONFIG.easings.out,
            },
            '+=0.15'
          );
        }

        // 4. Baris perintah mengetik: > kirim_rekomendasi_mutasi
        if (commandTextRef.current) {
          loopTl.to(
            commandTextRef.current,
            {
              clipPath: 'inset(0 0% 0 0)',
              duration: 0.95,
              ease: 'none',
            },
            '+=0.2'
          );
        }

        // Efek tombol ditekan
        if (buttonRef.current) {
          loopTl.to(
            buttonRef.current,
            {
              scale: 0.94,
              duration: 0.12,
              yoyo: true,
              repeat: 1,
              ease: 'power2.inOut',
            },
            '+=0.3'
          );
        }

        // 5. Konfirmasi muncul & status tombol berubah
        loopTl.add(() => {
          if (commandRowRef.current) gsap.set(commandRowRef.current, { display: 'none' });
          if (confirmedRowRef.current) {
            gsap.set(confirmedRowRef.current, { display: 'flex' });
            gsap.fromTo(confirmedRowRef.current, { opacity: 0, x: -6 }, { opacity: 1, x: 0, duration: 0.3 });
          }
          if (buttonRef.current) {
            buttonRef.current.innerText = 'Selesai ✓';
            buttonRef.current.className = 'px-2.5 py-1 text-xs font-bold rounded-sm transition-colors cursor-pointer shrink-0 bg-emerald-600 text-white';
          }
        });

        // Tahan selama 2.6 detik agar pengguna membaca hasilnya
        loopTl.to({}, { duration: 2.6 });

        // 6. Konsol fade out lembut sebelum siklus baru
        if (consoleBoxRef.current) {
          loopTl.to(consoleBoxRef.current, {
            opacity: 0.35,
            duration: 0.5,
            ease: 'power2.inOut',
          });
        }

        loopTl.to({}, { duration: 0.3 });

        // ScrollTrigger: Play saat card in-view, pause saat out-of-view
        const st = ScrollTrigger.create({
          trigger: rootRef.current,
          start: 'top bottom',
          end: 'bottom top',
          onToggle: (self) => {
            if (manualExecuted === null) {
              if (self.isActive) loopTl.play();
              else loopTl.pause();
            }
          },
        });

        return () => {
          st.kill();
          loopTl.kill();
        };
      });
    },
    { scope: rootRef, dependencies: [manualExecuted] }
  );

  const handleManualClick = () => {
    setManualExecuted((prev) => !prev);
  };

  return (
    <div
      ref={rootRef}
      className="landing-card-hover md:col-span-2 p-6 sm:p-8 flex flex-col lg:flex-row justify-between md:border-l border-slate-200 gap-6 items-stretch bg-white"
    >
      {/* Left Description inside Card 4 */}
      <div ref={leftColRef} className="lg:w-2/5 flex flex-col justify-between space-y-4">
        <div className="space-y-2.5">
          <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
            Deteksi Dini Masalah Operasional
          </h3>
          <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed">
            Tinjau perubahan pada transaksi, pengeluaran, dan persediaan agar hal yang perlu diperiksa lebih mudah terlihat.
          </p>
        </div>

        <div className="inline-flex items-center gap-1.5 text-xs text-brand-700 font-medium">
          <Activity className="h-3.5 w-3.5" />
          <span>Pemantauan aktivitas usaha</span>
        </div>
      </div>

      {/* Right Light Console UI Box */}
      <div
        ref={consoleBoxRef}
        className="lg:w-3/5 bg-slate-50 border border-slate-200 p-3.5 sm:p-4 rounded-none font-mono text-xs flex flex-col justify-between space-y-3 shadow-xs overflow-hidden"
      >
        <div className="space-y-2">
          {/* Baris 1: Running Engine (Typing mask) */}
          <p
            ref={line1Ref}
            className="text-slate-500 text-[11px] leading-tight select-none whitespace-nowrap overflow-hidden"
            style={{ clipPath: 'inset(0 0% 0 0)' }}
          >
            Memeriksa aktivitas usaha...
          </p>

          {/* Baris 2: Modul Pengawasan Aktif */}
          <p ref={line2Ref} className="text-brand-700 font-semibold flex items-center gap-1.5">
            <span
              ref={pulseDotRef}
              className="h-2 w-2 rounded-full bg-brand-600 shrink-0 origin-center"
            />
            <span>Ringkasan aktivitas</span>
          </p>

          {/* Baris 3: Tiga Sub-Baris Anomali */}
          <div ref={subRowsRef} className="space-y-1 pl-2 text-slate-700 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-slate-600">↳ pengeluaran</span>
              <span className="text-slate-500 text-[10px]">Tinjau catatan</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">↳ penjualan</span>
              <span className="text-emerald-700 font-medium text-[10px]">Catatan transaksi</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">↳ persediaan</span>
              <span className="text-amber-700 font-medium text-[10px]">Tinjau kebutuhan stok</span>
            </div>
          </div>
        </div>

        {/* Terminal Status & Action Button */}
        <div className="pt-2 border-t border-slate-200 flex items-center justify-between gap-2 min-h-[32px]">
          {/* Default Typing Command Row */}
          <div
            ref={commandRowRef}
            className="flex items-center space-x-1.5 text-slate-500 text-[11px] truncate"
          >
            <span className="text-brand-600">&gt;</span>
            <span
              ref={commandTextRef}
              className="text-slate-700 whitespace-nowrap overflow-hidden"
              style={{ clipPath: 'inset(0 0% 0 0)' }}
            >
              tinjau_ringkasan
            </span>
            <span ref={cursorRef} className="animate-pulse">
              _
            </span>
          </div>

          {/* Confirmed Status Row (Tampil setelah eksekusi) */}
          <div
            ref={confirmedRowRef}
            className="hidden items-center gap-1.5 text-emerald-700 text-[11px] font-bold"
          >
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            <span>Ringkasan siap ditinjau</span>
          </div>

          <button
            ref={buttonRef}
            type="button"
            onClick={handleManualClick}
            className="px-2.5 py-1 text-xs font-bold rounded-sm transition-colors cursor-pointer shrink-0 bg-brand-600 text-white hover:bg-brand-700 origin-center select-none"
          >
            Tinjau
          </button>
        </div>
      </div>
    </div>
  );
}
