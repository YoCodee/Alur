import { ArrowRight, Building2, Receipt, Sparkles } from 'lucide-react';

const steps = [
  { label: 'Kasir', detail: 'Catat pesanan', icon: Receipt },
  { label: 'Alur', detail: 'Data tersusun', icon: Sparkles },
  { label: 'Pemilik', detail: 'Pantau usaha', icon: Building2 },
];

export function HeroWorkflowPreview() {
  return (
    <div
      role="img"
      aria-label="Ilustrasi alur aktivitas dari kasir, diproses di Alur, hingga dapat dipantau pemilik usaha"
      className="relative mx-auto mt-8 w-full max-w-[760px] sm:mt-10"
    >
      <p className="mb-4 text-center text-[10px] font-semibold uppercase tracking-[0.16em] text-white/75 sm:mb-5 sm:text-xs">
        Ilustrasi alur aktivitas
      </p>
      <div className="relative grid grid-cols-3 items-center gap-2 sm:gap-6">
        <div aria-hidden="true" className="hero-preview-flow-track absolute left-[17%] right-[17%] top-1/2 h-px -translate-y-1/2 bg-white/30">
          <span className="hero-preview-flow-dot" />
          <span className="hero-preview-flow-dot hero-preview-flow-dot-delayed" />
        </div>

        {steps.map(({ label, detail, icon: Icon }, index) => (
          <div
            key={label}
            className="relative z-10 flex min-h-[92px] flex-col items-center justify-center rounded-xl border border-white/25 bg-white/[0.07] p-2.5 text-center sm:min-h-[104px] sm:p-3.5"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 text-white sm:h-9 sm:w-9">
              <Icon className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
            </span>
            <span className="mt-2 text-xs font-bold text-white sm:text-sm">
              {label}
            </span>
            <span className="mt-0.5 text-[9px] leading-tight text-white/75 sm:text-[10px]">
              {detail}
            </span>
            {index < steps.length - 1 && (
              <ArrowRight className="absolute -right-3 top-1/2 z-20 h-5 w-5 -translate-y-1/2 rounded-full bg-orange-600/70 p-0.5 text-white sm:-right-4" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
