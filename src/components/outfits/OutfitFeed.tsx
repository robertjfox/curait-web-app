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
  actionsDisabled?: boolean;
  autoScrollToPending?: boolean;
  onGenerateNext?: () => void;
  onMenuPress?: () => void;
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
  actionsDisabled = false,
  autoScrollToPending = true,
  onGenerateNext,
  onMenuPress,
  onRemixOutfit,
  onToggleSaved,
  scrollToOutfitId,
  revealOutfitId,
  onRevealComplete,
}: OutfitFeedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [now, setNow] = useState(() => Date.now());

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

  function handleNextFromCard(index: number) {
    const nextIndex = index + 1;
    if (nextIndex < outfits.length) {
      scrollToCard(nextIndex);
      return;
    }
    onGenerateNext?.();
  }

  // Continuously map each slide's distance from the viewport center to a
  // CSS scale variable so the active slide grows as you flick it away and
  // the incoming slide eases back to its resting size. Throttled via rAF
  // so we don't trigger a style write per scroll event on iOS, which
  // would cause paint flicker on top of an already heavy snap animation.
  const rafRef = useRef<number | null>(null);
  const lastIndexRef = useRef(0);

  // Mobile gets a more dramatic zoom-out on the outgoing slide because
  // the action bar dominates more of the viewport, so a subtle effect
  // reads as flat. Desktop keeps the lighter touch.
  function getZoomMagnitude() {
    if (typeof window === "undefined") return 0.15;
    return window.matchMedia("(pointer: coarse)").matches ? 0.3 : 0.15;
  }

  function scheduleScrollUpdate() {
    if (rafRef.current !== null) return;
    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null;
      const container = containerRef.current;
      if (!container) return;
      const height = container.clientHeight;
      if (height <= 0) return;

      const scrollTop = container.scrollTop;
      const viewportCenter = scrollTop + height / 2;
      const magnitude = getZoomMagnitude();

      const nextIndex = Math.round(scrollTop / height);
      if (nextIndex !== lastIndexRef.current) {
        lastIndexRef.current = nextIndex;
        setActiveIndex(nextIndex);
      }

      const children = container.children;
      const childCount = children.length;
      // Only update the active slide and its immediate neighbours —
      // off-screen slides never visually change, so writing their
      // CSS vars on every frame is just paint work for nothing.
      const start = Math.max(0, lastIndexRef.current - 1);
      const end = Math.min(childCount - 1, lastIndexRef.current + 1);
      for (let i = start; i <= end; i++) {
        const slide = children[i] as HTMLElement | undefined;
        if (!slide) continue;
        const slideCenter = i * height + height / 2;
        const offset = Math.abs(viewportCenter - slideCenter) / height;
        const clamped = Math.min(offset, 1);
        const scale = 1 + magnitude * clamped;
        slide.style.setProperty("--slide-zoom", scale.toFixed(4));
      }
    });
  }

  useEffect(() => {
    scheduleScrollUpdate();
  }, [outfits.length]);

  // Native mandatory snap on iOS / Android handles large drags well —
  // it commits the next slide once the user crosses ~50% of viewport.
  // Where it falls short is a quick, low-distance flick: the browser
  // sees a small displacement and bounces back to the origin slide,
  // which feels broken. We only override that one case.
  const touchStartRef = useRef<{ scrollTop: number; time: number } | null>(null);

  function handleTouchStart() {
    const container = containerRef.current;
    if (!container) return;
    touchStartRef.current = {
      scrollTop: container.scrollTop,
      time: Date.now(),
    };
  }

  function handleTouchEnd() {
    const container = containerRef.current;
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!container || !start) return;

    const height = container.clientHeight;
    if (height <= 0) return;

    const deltaY = container.scrollTop - start.scrollTop;
    const elapsed = Math.max(1, Date.now() - start.time);
    const velocity = Math.abs(deltaY) / elapsed; // px / ms

    const flickVelocity = 0.35; // px/ms — fast deliberate flick
    const isLargeDrag = Math.abs(deltaY) >= height * 0.5;
    const isFlick = velocity >= flickVelocity && Math.abs(deltaY) > 8;

    // Large drag → let native snap handle. Tiny accidental scroll →
    // also let native snap handle (snaps back to origin).
    if (isLargeDrag || !isFlick) return;

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
      ref={containerRef}
      onScroll={scheduleScrollUpdate}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      className="h-full w-full snap-y snap-mandatory overflow-y-auto bg-black scrollbar-hide"
    >
      {outfits.map((outfit, index) => (
        <section
          key={outfit.id}
          className="h-full w-full snap-start snap-always"
        >
          <OutfitCard
            outfit={outfit}
            prompt={pendingPrompt}
            isActive={index === activeIndex}
            isLatest={outfit.id === latestOutfitId}
            shouldSimulateReveal={outfit.id === revealOutfitId}
            onRevealComplete={onRevealComplete}
            nextDisabled={isWaitingForProductSearch(outfit)}
            actionsDisabled={actionsDisabled || isWaitingForProductSearch(outfit)}
            onMenuPress={onMenuPress}
            onRemixOutfit={onRemixOutfit}
            onToggleSaved={onToggleSaved}
            onNextOutfit={() => handleNextFromCard(index)}
          />
        </section>
      ))}

      {showPendingCard && (
        <section className="h-full w-full snap-start snap-always">
          <OutfitCard
            loading
            prompt={pendingPrompt}
            actionsDisabled={actionsDisabled}
            onMenuPress={onMenuPress}
          />
        </section>
      )}
    </div>
  );
}
