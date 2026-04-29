"use client";

import { useEffect, useRef, useState } from "react";
import OutfitCard from "./OutfitCard";
import type { Outfit } from "@/types/api";

const PRODUCT_SEARCH_GRACE_PERIOD_MS = 45_000;

interface OutfitFeedProps {
  outfits: Outfit[];
  selectedOutfitId?: string;
  pendingPrompt?: string;
  isGenerating?: boolean;
  autoScrollToPending?: boolean;
  onGenerateNext?: () => void;
  onRemixOutfit?: (outfit: Outfit, feedback: string) => Promise<void>;
  onToggleSaved?: (outfit: Outfit, saved: boolean) => Promise<void>;
  scrollToOutfitId?: string | null;
  revealOutfitId?: string | null;
  onRevealComplete?: () => void;
}

export default function OutfitFeed({
  outfits,
  selectedOutfitId,
  pendingPrompt,
  isGenerating = false,
  autoScrollToPending = true,
  onGenerateNext,
  onRemixOutfit,
  onToggleSaved,
  scrollToOutfitId,
  revealOutfitId,
  onRevealComplete,
}: OutfitFeedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  // Drive snap + chrome-collapse from the document, not an inner div.
  // Mobile browsers only shrink their URL bar / toolbar when the
  // window is the scrolled element, so OutfitFeed temporarily promotes
  // the document to a snap container while it's mounted.
  useEffect(() => {
    const html = document.documentElement;
    html.classList.add("snap-document");

    // Nudge mobile Safari into "scrolled" state on first paint so it
    // engages the small URL bar without requiring a user swipe.
    if (window.scrollY === 0) {
      window.scrollTo(0, 1);
    }

    return () => {
      html.classList.remove("snap-document");
    };
  }, []);

  useEffect(() => {
    if (!selectedOutfitId || !containerRef.current) return;
    const index = outfits.findIndex((o) => o.id === selectedOutfitId);
    if (index < 0) return;
    const child = containerRef.current.children[index] as
      | HTMLElement
      | undefined;
    child?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [selectedOutfitId, outfits]);

  useEffect(() => {
    if (!scrollToOutfitId || !containerRef.current) return;
    const index = outfits.findIndex((o) => o.id === scrollToOutfitId);
    if (index < 0) return;
    const child = containerRef.current.children[index] as
      | HTMLElement
      | undefined;
    child?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [scrollToOutfitId, outfits]);

  const showPendingCard = isGenerating;
  const latestOutfitId = outfits[outfits.length - 1]?.id;

  function isWaitingForProductSearch(outfit: Outfit) {
    if (!latestOutfitId || outfit.id !== latestOutfitId) return false;

    const createdAt = Date.parse(outfit.created_at);
    if (!Number.isFinite(createdAt)) return false;
    if (now - createdAt > PRODUCT_SEARCH_GRACE_PERIOD_MS) return false;

    const items = outfit.outfit_items ?? [];
    if (items.length === 0) return true;

    return items.some((item) => (item.search_results?.length ?? 0) === 0);
  }

  const latestOutfitWaitingForProducts = latestOutfitId
    ? isWaitingForProductSearch(outfits[outfits.length - 1])
    : false;

  useEffect(() => {
    if (!latestOutfitWaitingForProducts) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [latestOutfitWaitingForProducts]);

  useEffect(() => {
    if (!showPendingCard || !autoScrollToPending || !containerRef.current)
      return;
    const container = containerRef.current;
    const child = container.children[container.children.length - 1] as
      | HTMLElement
      | undefined;
    child?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [autoScrollToPending, showPendingCard, outfits.length]);

  function scrollToCard(index: number) {
    const container = containerRef.current;
    if (!container) return;
    const child = container.children[index] as HTMLElement | undefined;
    child?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // Continuously map each slide's distance from the viewport center to a
  // CSS scale variable so the active slide grows as you flick it away and
  // the incoming slide eases back to its resting size. Driven by JS rather
  // than `animation-timeline: view()` so it works on every browser AND
  // responds in real time to a finger/mouse drag, even mid-snap.
  function updateSlideZoom() {
    const container = containerRef.current;
    if (!container) return;
    const height = window.innerHeight;
    if (height <= 0) return;
    const containerTop = container.getBoundingClientRect().top + window.scrollY;
    const viewportCenter = window.scrollY + height / 2;

    Array.from(container.children).forEach((node, i) => {
      const slide = node as HTMLElement;
      const slideCenter = containerTop + i * height + height / 2;
      const offset = Math.abs(viewportCenter - slideCenter) / height;
      const clamped = Math.min(offset, 1);
      const scale = 1 + 0.15 * clamped;
      slide.style.setProperty("--slide-zoom", scale.toFixed(4));
    });
  }

  useEffect(() => {
    function onScroll() {
      const container = containerRef.current;
      if (!container) return;
      const height = window.innerHeight;
      if (height <= 0) return;
      const containerTop =
        container.getBoundingClientRect().top + window.scrollY;
      const relative = Math.max(0, window.scrollY - containerTop);
      setActiveIndex(Math.round(relative / height));
      updateSlideZoom();
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    onScroll();

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  useEffect(() => {
    updateSlideZoom();
  }, [outfits.length]);

  // `snap-mandatory` only commits a snap once the user has dragged ~50%
  // of a slide. Anything less and the browser bounces them back to the
  // origin slide, which feels broken for light, intentional swipes.
  // Track touch start/end manually and force the next/prev slide if the
  // gesture clears either a distance or a velocity threshold.
  const touchStartRef = useRef<{ scrollY: number; time: number } | null>(null);

  function handleTouchStart() {
    touchStartRef.current = {
      scrollY: window.scrollY,
      time: Date.now(),
    };
  }

  function handleTouchEnd() {
    const container = containerRef.current;
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!container || !start) return;

    const height = window.innerHeight;
    if (height <= 0) return;

    const deltaY = window.scrollY - start.scrollY;
    const elapsed = Math.max(1, Date.now() - start.time);
    const velocity = Math.abs(deltaY) / elapsed; // px / ms

    const distanceThreshold = height * 0.06; // ≥ 6% of viewport
    const velocityThreshold = 0.2; // ~ a relaxed flick

    if (
      Math.abs(deltaY) < distanceThreshold &&
      velocity < velocityThreshold
    ) {
      return;
    }

    const containerTop = container.getBoundingClientRect().top + window.scrollY;
    const startRelative = Math.max(0, start.scrollY - containerTop);
    const direction = deltaY > 0 ? 1 : -1;
    const startIndex = Math.round(startRelative / height);
    const targetIndex = startIndex + direction;
    if (targetIndex < 0) return;
    if (targetIndex >= container.children.length) return;

    const target = container.children[targetIndex] as HTMLElement | undefined;
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      className="w-full bg-black"
    >
      {outfits.map((outfit, index) => (
        <section
          key={outfit.id}
          className="h-[100dvh] w-full snap-start snap-always"
        >
          <OutfitCard
            key={`${outfit.id}-${index === activeIndex ? "active" : "inactive"}`}
            outfit={outfit}
            prompt={pendingPrompt}
            isActive={index === activeIndex}
            isLatest={outfit.id === latestOutfitId}
            shouldSimulateReveal={outfit.id === revealOutfitId}
            onRevealComplete={onRevealComplete}
            nextDisabled={isWaitingForProductSearch(outfit)}
            onRemixOutfit={onRemixOutfit}
            onToggleSaved={onToggleSaved}
            onNextOutfit={
              onGenerateNext ??
              (() => scrollToCard(Math.min(index + 1, outfits.length - 1)))
            }
          />
        </section>
      ))}

      {showPendingCard && (
        <section className="h-[100dvh] w-full snap-start snap-always">
          <OutfitCard loading prompt={pendingPrompt} />
        </section>
      )}
    </div>
  );
}
