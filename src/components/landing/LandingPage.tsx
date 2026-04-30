"use client";

import Image from "next/image";

interface LandingPageProps {
  onStart: () => void;
}

export default function LandingPage({ onStart }: LandingPageProps) {
  return (
    <main className="relative flex min-h-[100dvh] overflow-x-hidden bg-black text-white">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#111,#000_58%)]" />
      <div className="landing-orb landing-orb-one absolute -left-20 top-8 h-72 w-72 rounded-full bg-white/20 blur-3xl" />
      <div className="landing-orb landing-orb-two absolute -right-16 top-28 h-80 w-80 rounded-full bg-indigo-400/25 blur-3xl" />
      <div className="landing-orb landing-orb-three absolute bottom-4 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-stone-300/12 blur-3xl" />

      <section className="relative z-10 mx-auto flex w-full max-w-3xl items-center justify-center px-5 py-[max(2rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] md:px-10">
        <div className="flex flex-col items-center justify-center gap-8 text-center">
          <div className="flex flex-col items-center">
            <Image
              src="/curait-logo.png"
              alt="Curait"
              width={176}
              height={56}
              className="mb-8 h-12 w-auto invert"
              priority
            />
            <h1 className="max-w-xl text-5xl font-semibold leading-[0.95] tracking-[-0.06em] md:text-7xl">
              Your AI stylist.
            </h1>
          </div>

          <button
            type="button"
            onClick={onStart}
            className="inline-flex h-16 items-center justify-center rounded-full bg-white px-9 text-base font-semibold text-black transition hover:bg-white/90"
          >
            Get started
          </button>
        </div>
      </section>
    </main>
  );
}
