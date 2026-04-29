"use client";

import { getImageBackedProducts, getProductImageUrl } from "@/lib/productImages";
import type { Outfit, SearchResult } from "@/types/api";

function cleanKeywords(keywords?: string | null): string {
  if (!keywords) return "";
  const words = keywords.split(" ");
  const cleaned = words.length > 1 ? words.slice(1).join(" ") : keywords;
  return cleaned.replace(/\bcolor:\s*/gi, "").trim();
}

interface Props {
  outfit: Outfit;
}

export default function OutfitCardProductFooter({ outfit }: Props) {
  const items = outfit.outfit_items ?? [];

  const handleProductClick = (product: SearchResult) => {
    if (product.link) {
      window.open(product.link, "_blank", "noopener,noreferrer");
    }
  };

  if (items.length === 0) {
    return (
      <div className="space-y-4 px-3 py-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
            <div className="flex gap-2">
              {[1, 2, 3].map((j) => (
                <div
                  key={j}
                  className="h-28 w-28 shrink-0 animate-pulse rounded-lg bg-gray-200"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4 px-3 py-4">
      {items.map((item) => {
        const label = item.title || cleanKeywords(item.keywords) || item.type;
        const products = item.search_results ?? [];
        const imageProducts = getImageBackedProducts(products);

        return (
          <div key={item.id} className="space-y-2">
            <span className="text-sm font-semibold capitalize text-gray-800">
              {label}
            </span>

            <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-2">
              {imageProducts.length === 0
                ? (
                    <div className="flex h-24 items-center text-sm text-gray-400">
                      Finding products...
                    </div>
                  )
                : imageProducts.map((product, productIndex) => {
                    const integerPrice = product.price?.split(".")[0];
                    const imageUrl = getProductImageUrl(product);
                    if (!imageUrl) return null;

                    return (
                      <button
                        key={productIndex}
                        onClick={() => handleProductClick(product)}
                        className="group relative h-36 w-36 shrink-0 overflow-hidden rounded-lg"
                      >
                        <img
                          src={imageUrl}
                          alt={product.title || "Product"}
                          className="h-full w-full object-cover"
                        />

                        {integerPrice && (
                          <span className="absolute bottom-1 left-1 rounded bg-white/60 px-1.5 py-0.5 text-xs font-semibold text-black">
                            {integerPrice}
                          </span>
                        )}

                        {product.source && (
                          <span className="absolute bottom-1 right-1 rounded bg-white/60 px-1 py-0.5 text-[10px] text-gray-600">
                            {product.source}
                          </span>
                        )}
                      </button>
                    );
                  })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
