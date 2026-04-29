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
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!selectedOutfitId || !scrollRef.current) return;
    const index = outfits.findIndex((o) => o.id === selectedOutfitId);
    if (index < 0) return;
    const container = scrollRef.current;
    const child = container.children[index] as HTMLElement | undefined;
    child?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [selectedOutfitId, outfits]);

  useEffect(() => {
    if (!scrollToOutfitId || !scrollRef.current) return;
    const index = outfits.findIndex((o) => o.id === scrollToOutfitId);
    if (index < 0) return;
    const container = scrollRef.current;
    const child = container.children[index] as HTMLElement | undefined;
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
    if (!showPendingCard || !autoScrollToPending || !scrollRef.current) return;
    const container = scrollRef.current;
    const child = container.children[container.children.length - 1] as
      | HTMLElement
      | undefined;
    child?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [autoScrollToPending, showPendingCard, outfits.length]);

  function scrollToCard(index: number) {
    const container = scrollRef.current;
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
    const container = scrollRef.current;
    if (!container) return;
    const height = container.clientHeight;
    if (height <= 0) return;
    const scrollTop = container.scrollTop;
    const viewportCenter = scrollTop + height / 2;

    Array.from(container.children).forEach((node, i) => {
      const slide = node as HTMLElement;
      const slideCenter = i * height + height / 2;
      const offset = Math.abs(viewportCenter - slideCenter) / height;
      const clamped = Math.min(offset, 1);
      const scale = 1 + 0.15 * clamped;
      slide.style.setProperty("--slide-zoom", scale.toFixed(4));
    });
  }

  function handleScroll() {
    const container = scrollRef.current;
    if (!container) return;
    const nextIndex = Math.round(container.scrollTop / container.clientHeight);
    setActiveIndex(nextIndex);
    updateSlideZoom();
  }

  useEffect(() => {
    updateSlideZoom();
  }, [outfits.length]);

  // `snap-mandatory` only commits a snap once the user has dragged ~50%
  // of a slide. Anything less and the browser bounces them back to the
  // origin slide, which feels broken for light, intentional swipes.
  // Track touch start/end manually and force the next/prev slide if the
  // gesture clears either a distance or a velocity threshold.
  const touchStartRef = useRef<{ scrollTop: number; time: number } | null>(null);

  function handleTouchStart() {
    const container = scrollRef.current;
    if (!container) return;
    touchStartRef.current = {
      scrollTop: container.scrollTop,
      time: Date.now(),
    };
  }

  function handleTouchEnd() {
    const container = scrollRef.current;
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!container || !start) return;

    const height = container.clientHeight;
    if (height <= 0) return;

    const deltaY = container.scrollTop - start.scrollTop;
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

    const direction = deltaY > 0 ? 1 : -1;
    const startIndex = Math.round(start.scrollTop / height);
    const targetIndex = startIndex + direction;
    if (targetIndex < 0) return;
    if (targetIndex >= container.children.length) return;

    const target = container.children[targetIndex] as HTMLElement | undefined;
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      className="h-full w-full snap-y snap-mandatory overflow-y-auto scroll-smooth bg-black scrollbar-hide"
    >
      {outfits.map((outfit, index) => (
        <section key={outfit.id} className="h-full w-full snap-start snap-always">
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
        <section className="h-full w-full snap-start snap-always">
          <OutfitCard loading prompt={pendingPrompt} />
        </section>
      )}
    </div>
  );
}
