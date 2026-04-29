"use client";

import { useEffect, useRef, useState } from "react";
import OutfitCard from "./OutfitCard";
import type { Outfit } from "@/types/api";

interface OutfitFeedProps {
  outfits: Outfit[];
  selectedOutfitId?: string;
  pendingPrompt?: string;
  isGenerating?: boolean;
  autoScrollToPending?: boolean;
  onGenerateNext?: () => void;
  onRemixOutfit?: (outfit: Outfit, feedback: string) => Promise<void>;
  onToggleSaved?: (outfit: Outfit) => Promise<void>;
  scrollToOutfitId?: string | null;
  revealOutfitId?: string | null;
  onRevealComplete?: () => void;
  nextCooldownOutfitId?: string | null;
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
  nextCooldownOutfitId,
}: OutfitFeedProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

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

  function handleScroll() {
    const container = scrollRef.current;
    if (!container) return;
    const nextIndex = Math.round(container.scrollTop / container.clientHeight);
    setActiveIndex(nextIndex);
  }

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className="h-full w-full snap-y snap-mandatory overflow-y-auto scroll-smooth bg-black scrollbar-hide"
    >
      {outfits.map((outfit, index) => (
        <section key={outfit.id} className="h-full w-full snap-start snap-always">
          <OutfitCard
            key={`${outfit.id}-${index === activeIndex ? "active" : "inactive"}`}
            outfit={outfit}
            prompt={pendingPrompt}
            isActive={index === activeIndex}
            shouldSimulateReveal={outfit.id === revealOutfitId}
            onRevealComplete={onRevealComplete}
            nextDisabled={outfit.id === nextCooldownOutfitId}
            nextCountdown={outfit.id === nextCooldownOutfitId}
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
