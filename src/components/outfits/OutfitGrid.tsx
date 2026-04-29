"use client";

import type { Outfit } from "@/types/api";

interface OutfitGridProps {
  outfits: Outfit[];
  onSelectOutfit?: (outfitId: string) => void;
}

export default function OutfitGrid({
  outfits,
  onSelectOutfit,
}: OutfitGridProps) {
  const imageReadyOutfits = outfits.filter(
    (outfit) => outfit.default_rendering_url || outfit.vton_image_url
  );

  if (imageReadyOutfits.length === 0) return null;

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-3">
        {imageReadyOutfits.map((outfit) => {
          const imageUrl = outfit.default_rendering_url || outfit.vton_image_url;
          if (!imageUrl) return null;
          return (
            <button
              key={outfit.id}
              onClick={() => onSelectOutfit?.(outfit.id)}
              className="group relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-gray-100 transition-transform hover:scale-[1.02]"
            >
              <img
                src={imageUrl}
                alt={outfit.name || "Outfit"}
                className="h-full w-full object-cover"
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
