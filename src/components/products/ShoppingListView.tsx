"use client";

import { useDataContext } from "@/contexts/DataContext";
import type { SavedProduct } from "@/types/api";

function priceForCard(price?: string | null): string | null {
  if (!price) return null;
  return price.split(".")[0];
}

export default function ShoppingListView() {
  const { savedProducts, toggleProductSaved } = useDataContext();

  return (
    <div className="min-h-dvh w-full bg-black px-5 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] text-white">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-6">
          <h1 className="text-3xl font-semibold">Shopping list</h1>
        </div>

        {savedProducts.loading ? (
          <div className="flex min-h-72 items-center justify-center text-sm text-white/45">
            Loading shopping list...
          </div>
        ) : savedProducts.products.length === 0 ? (
          <div className="flex min-h-72 items-center justify-center rounded-3xl border border-white/10 bg-white/[0.03] px-8 text-center text-sm text-white/50">
            Tap the heart on any product to save it here.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-2 gap-y-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {savedProducts.products.map((product) => (
              <ShoppingListTile
                key={product.id}
                product={product}
                onUnsave={() =>
                  toggleProductSaved(product.snapshot, false, {
                    outfitId: product.outfit_id ?? undefined,
                    outfitItemId: product.outfit_item_id ?? undefined,
                  })
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ShoppingListTile({
  product,
  onUnsave,
}: {
  product: SavedProduct;
  onUnsave: () => void;
}) {
  const imageUrl = product.image_url || product.snapshot?.imageUrl;
  const price = priceForCard(product.price ?? product.snapshot?.price);

  function openProduct() {
    if (product.link) {
      window.open(product.link, "_blank", "noopener,noreferrer");
    }
  }

  function handleHeart(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    onUnsave();
  }

  const title = product.title || product.snapshot?.title;

  return (
    <div className="group overflow-hidden rounded-[2rem] bg-white/10 transition hover:bg-white/15">
      <button
        type="button"
        onClick={openProduct}
        className="block w-full text-left"
      >
        <div className="relative aspect-square bg-black/50 p-2">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt={product.title || "Product"}
              className="h-full w-full rounded-[1.5rem] object-cover transition duration-300 group-hover:scale-[1.02]"
            />
          ) : (
            <div className="flex h-full items-center justify-center rounded-[1.5rem] bg-black/40 text-center text-xs text-white/40">
              No image
            </div>
          )}

          <span
            role="button"
            tabIndex={0}
            onClick={handleHeart}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                handleHeart(event as unknown as React.MouseEvent);
              }
            }}
            aria-label="Remove from shopping list"
            className="absolute right-3 top-3 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-black/25 text-red-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_1px_2px_rgba(0,0,0,0.25)] ring-1 ring-inset ring-white/25 backdrop-blur-md backdrop-saturate-150 transition hover:bg-black/35"
          >
            <svg
              className="h-3.5 w-3.5 drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]"
              viewBox="0 0 24 24"
              fill="currentColor"
              stroke="currentColor"
              strokeWidth={2.25}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"
              />
            </svg>
          </span>
        </div>

        <div className="space-y-0.5 px-3 pb-3 pt-1.5 text-white">
          {title && (
            <p className="line-clamp-1 text-[13px] font-medium leading-snug text-white/90">
              {title}
            </p>
          )}
          <div className="flex min-w-0 items-center justify-between gap-2">
            {price && (
              <span className="shrink-0 text-sm font-semibold">{price}</span>
            )}
            {product.source && (
              <span className="min-w-0 truncate text-right text-xs text-white/65">
                {product.source}
              </span>
            )}
          </div>
        </div>
      </button>
    </div>
  );
}
