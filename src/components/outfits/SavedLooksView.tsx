"use client";

import { useEffect, useMemo, useState } from "react";
import { useDataContext } from "@/contexts/DataContext";
import OutfitCard from "./OutfitCard";
import LoadingScreen from "@/components/ui/LoadingScreen";
import type { Outfit } from "@/types/api";

function getImageUrl(outfit: Outfit): string | null {
  return outfit.default_rendering_url || outfit.vton_image_url || null;
}

export default function SavedLooksView({
  onMenuPress,
}: {
  onMenuPress?: () => void;
}) {
  const { savedOutfits, toggleOutfitSaved } = useDataContext();
  const [selectedOutfitId, setSelectedOutfitId] = useState<string | null>(null);
  const selectedOutfit = useMemo(
    () =>
      selectedOutfitId
        ? savedOutfits.outfits.find((outfit) => outfit.id === selectedOutfitId)
        : null,
    [savedOutfits.outfits, selectedOutfitId],
  );

  useEffect(() => {
    if (selectedOutfitId && !selectedOutfit) {
      setSelectedOutfitId(null);
    }
  }, [selectedOutfit, selectedOutfitId]);

  if (savedOutfits.loading && !selectedOutfit) {
    return <LoadingScreen />;
  }

  if (selectedOutfit) {
    const currentIndex = savedOutfits.outfits.findIndex(
      (outfit) => outfit.id === selectedOutfit.id,
    );
    const nextOutfit = savedOutfits.outfits[currentIndex + 1];

    return (
      <div className="relative flex flex-1 overflow-hidden bg-black">
        <OutfitCard
          outfit={selectedOutfit}
          isActive
          onToggleSaved={toggleOutfitSaved}
          onNextOutfit={
            nextOutfit ? () => setSelectedOutfitId(nextOutfit.id) : undefined
          }
        />
        <button
          type="button"
          onClick={() => setSelectedOutfitId(null)}
          className="absolute left-4 top-[max(1rem,env(safe-area-inset-top))] z-30 rounded-full bg-black/45 px-4 py-2 text-sm font-medium text-white backdrop-blur transition hover:bg-white/10"
        >
          Saved looks
        </button>
        {onMenuPress && (
          <MobileMenuButton onClick={onMenuPress} />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto bg-black px-5 py-8 text-white">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <h1 className="text-3xl font-semibold">Saved looks</h1>
          {onMenuPress && (
            <MobileMenuButton onClick={onMenuPress} inline />
          )}
        </div>

        {savedOutfits.outfits.length === 0 ? (
          <div className="flex min-h-72 items-center justify-center rounded-3xl border border-white/10 bg-white/[0.03] px-8 text-center text-sm text-white/50">
            Tap the thumbs-up on an outfit to save it here.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-2 gap-y-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
            {savedOutfits.outfits.map((outfit) => {
              const imageUrl = getImageUrl(outfit);

              return (
                <button
                  key={outfit.id}
                  type="button"
                  onClick={() => setSelectedOutfitId(outfit.id)}
                  className="group overflow-hidden rounded-[2rem] bg-white/10 transition hover:bg-white/15"
                >
                  <div className="aspect-[1/2] bg-black/50">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={outfit.name}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center px-4 text-center text-xs text-white/40">
                        No image yet
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function MobileMenuButton({
  onClick,
  inline = false,
}: {
  onClick: () => void;
  inline?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${
        inline
          ? "relative md:hidden"
          : "absolute right-4 top-[max(1rem,env(safe-area-inset-top))] z-30 md:hidden"
      } flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/15`}
      aria-label="Open menu"
    >
      <svg
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4 6h16M4 12h16M4 18h16"
        />
      </svg>
    </button>
  );
}
