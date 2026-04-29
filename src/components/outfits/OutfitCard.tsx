"use client";

import { useEffect, useMemo, useState } from "react";
import { getImageBackedProducts, getProductImageUrl } from "@/lib/productImages";
import type { CSSProperties, ReactNode } from "react";
import type { Outfit, OutfitItem, SearchResult } from "@/types/api";

interface OutfitCardProps {
  outfit?: Outfit;
  loading?: boolean;
  prompt?: string;
  isActive?: boolean;
  onNextOutfit?: () => void;
  onRemixOutfit?: (outfit: Outfit, feedback: string) => Promise<void>;
}

function getImageUrl(outfit?: Outfit): string | null {
  return outfit?.default_rendering_url || outfit?.vton_image_url || null;
}

function cleanSearchTerm(keywords?: string | null): string {
  return (keywords || "")
    .replace(/\bmens\b|\bwomens\b/gi, "")
    .replace(/\bcolor:\s*/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

export default function OutfitCard({
  outfit,
  loading = false,
  prompt,
  isActive = false,
  onNextOutfit,
  onRemixOutfit,
}: OutfitCardProps) {
  const [productsOpen, setProductsOpen] = useState(false);
  const [remixOpen, setRemixOpen] = useState(false);
  const [revealState, setRevealState] = useState<{
    outfitId: string | null;
    phase: "loading" | "collecting" | "image";
  }>({ outfitId: null, phase: "loading" });
  const [revealedOutfitIds, setRevealedOutfitIds] = useState<Set<string>>(
    () => new Set()
  );
  const imageUrl = getImageUrl(outfit);
  const items = useMemo(
    () => outfit?.outfit_items ?? [],
    [outfit?.outfit_items]
  );
  const shouldSimulateReveal = Boolean(
    outfit?.id &&
      isActive &&
      imageUrl &&
      !loading &&
      !revealedOutfitIds.has(outfit.id)
  );
  const revealPhase =
    shouldSimulateReveal && revealState.outfitId === outfit?.id
      ? revealState.phase
      : "loading";
  const showImage =
    Boolean(imageUrl) &&
    !loading &&
    (!shouldSimulateReveal || revealPhase !== "loading");
  const productPreviewImages = useMemo(
    () =>
      getImageBackedProducts(items.flatMap((item) => item.search_results ?? []))
        .map((product) => getProductImageUrl(product))
        .filter((url): url is string => Boolean(url))
        .slice(0, 3),
    [items]
  );
  const title = outfit?.name || prompt || "Your outfit";

  useEffect(() => {
    if (!shouldSimulateReveal || !outfit?.id) return;

    const collectTimer = window.setTimeout(() => {
      setRevealState({ outfitId: outfit.id, phase: "collecting" });
    }, 2200);
    const imageTimer = window.setTimeout(() => {
      setRevealState({ outfitId: outfit.id, phase: "image" });
      setRevealedOutfitIds((current) => new Set(current).add(outfit.id));
    }, 3400);

    return () => {
      window.clearTimeout(collectTimer);
      window.clearTimeout(imageTimer);
    };
  }, [outfit?.id, shouldSimulateReveal]);

  return (
    <article className="relative h-full w-full overflow-hidden bg-black text-white">
      {showImage ? (
        <>
          <img
            src={imageUrl}
            alt={title}
            className="absolute inset-x-0 top-0 h-[calc(100%-3.25rem)] w-full scale-[1.01] object-cover object-top"
          />
          {productPreviewImages.length > 0 && revealPhase === "collecting" && (
            <ProductCollectOverlay items={items} />
          )}
        </>
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#3b3b3b,transparent_35%),linear-gradient(180deg,#121212,#050505)]">
          {items.length > 0 ? (
            <div className="flex h-full items-center px-5 pb-24 pt-20">
              <ProductPreviewRows items={items} />
            </div>
          ) : (
            <ConceptLoading />
          )}
        </div>
      )}

      {!showImage && (
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/55 via-transparent to-black/80" />
      )}

      <BottomActionBar
        canOpenProducts={Boolean(outfit)}
        onProducts={() => outfit && setProductsOpen(true)}
        canRemix={Boolean(outfit && onRemixOutfit)}
        onRemix={() => outfit && onRemixOutfit && setRemixOpen(true)}
        onNextOutfit={onNextOutfit}
      />

      {productsOpen && outfit && (
        <ProductBrowserOverlay
          outfit={outfit}
          onClose={() => setProductsOpen(false)}
        />
      )}

      {remixOpen && outfit && onRemixOutfit && (
        <RemixOverlay
          outfit={outfit}
          onClose={() => setRemixOpen(false)}
          onSubmit={async (feedback) => {
            await onRemixOutfit(outfit, feedback);
            setRemixOpen(false);
          }}
        />
      )}
    </article>
  );
}

function ConceptLoading() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-8 pb-24 text-center">
      <p className="text-sm font-medium uppercase tracking-[0.22em] text-white/55">
        Generating outfit concept
      </p>
      <svg
        className="h-6 w-6 animate-spin text-white/50"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
        />
      </svg>
    </div>
  );
}

function ProductPreviewRows({
  items,
  collecting = false,
}: {
  items: OutfitItem[];
  collecting?: boolean;
}) {
  return (
    <div className="w-full space-y-5 overflow-hidden">
      {items.map((item, rowIndex) => {
        const products = getImageBackedProducts(item.search_results ?? []).slice(
          0,
          3
        );
        const hasResults = (item.search_results?.length ?? 0) > 0;
        const isRanked = (item.search_results ?? []).some(
          (product) => typeof product.ranking === "number"
        );
        const state = !hasResults ? "Searching" : !isRanked ? "Ranking" : "Ready";

        return (
          <div key={item.id} className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <p className="truncate text-left text-xs font-medium uppercase tracking-[0.18em] text-white/55">
                {item.title || cleanSearchTerm(item.keywords) || item.type}
              </p>
              {state !== "Ready" && (
                <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-white/45">
                  {state}
                </span>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[0, 1, 2].map((index) => {
                const product = products[index];
                const imageUrl = product ? getProductImageUrl(product) : null;

                if (imageUrl) {
                  return (
                    <div
                      key={`${product?.link || item.id}-${index}`}
                      className={`aspect-square overflow-hidden rounded-xl bg-white/10 shadow-2xl ${
                        collecting ? "product-collect-to-button" : ""
                      }`}
                      style={
                        collecting
                          ? ({
                              "--collect-x": `${(1 - index) * 118}px`,
                              "--collect-y": `calc(42vh - ${rowIndex * 112}px)`,
                              animationDelay: `${rowIndex * 60 + index * 45}ms`,
                            } as CSSProperties)
                          : undefined
                      }
                    >
                      <img
                        src={imageUrl}
                        alt={product.title || "Product"}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  );
                }

                return (
                  <div
                    key={`${item.id}-placeholder-${index}`}
                    className="flex aspect-square items-center justify-center rounded-xl bg-white/10 shadow-2xl"
                  >
                    <svg
                      className="h-5 w-5 animate-spin text-white/35"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ProductCollectOverlay({ items }: { items: OutfitItem[] }) {
  return (
    <div className="product-collect-overlay pointer-events-none absolute inset-0 z-20 bg-black/10">
      <div className="flex h-full items-center px-5 pb-24 pt-20">
        <ProductPreviewRows items={items} collecting />
      </div>
    </div>
  );
}

function ProductBrowserOverlay({
  outfit,
  onClose,
}: {
  outfit: Outfit;
  onClose: () => void;
}) {
  const items = outfit.outfit_items ?? [];

  return (
    <div className="absolute inset-0 z-40 bg-black text-white">
      <div className="sticky top-0 z-10 flex items-center justify-between bg-black/85 px-5 pb-3 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-white/40">
            Products
          </p>
          <h2 className="mt-1 max-w-[16rem] truncate text-lg font-semibold">
            {outfit.name}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
          aria-label="Close products"
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
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <div className="h-[calc(100%-4.75rem)] overflow-y-auto px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4 scrollbar-hide">
        {items.length > 0 ? (
          <ProductBrowserRows items={items} />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-white/45">
            Finding products...
          </div>
        )}
      </div>
    </div>
  );
}

function ProductBrowserRows({ items }: { items: OutfitItem[] }) {
  return (
    <div className="space-y-7">
      {items.map((item) => {
        const products = getImageBackedProducts(item.search_results ?? []);

        return (
          <div key={item.id} className="space-y-2.5">
            <p className="truncate text-left text-xs font-medium uppercase tracking-[0.18em] text-white/55">
              {item.title || cleanSearchTerm(item.keywords) || item.type}
            </p>

            {products.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {products.map((product, index) => (
                  <ProductTile
                    key={`${product.link || product.title}-${index}`}
                    product={product}
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {[0, 1, 2].map((index) => (
                  <div
                    key={`${item.id}-empty-${index}`}
                    className="flex aspect-square items-center justify-center rounded-xl bg-white/10"
                  >
                    <svg
                      className="h-5 w-5 animate-spin text-white/35"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ProductTile({ product }: { product: SearchResult }) {
  const imageUrl = getProductImageUrl(product);
  const price = product.price?.split(".")[0];

  if (!imageUrl) return null;

  return (
    <button
      type="button"
      onClick={() => {
        if (product.link) {
          window.open(product.link, "_blank", "noopener,noreferrer");
        }
      }}
      className="group text-left"
    >
      <div className="aspect-square overflow-hidden rounded-xl bg-white/10 shadow-2xl">
        <img
          src={imageUrl}
          alt={product.title || "Product"}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
        />
      </div>
      <div className="mt-1.5 flex min-w-0 items-center justify-between gap-1.5 text-white">
        {price && (
          <span className="shrink-0 text-xs font-semibold leading-4">
            {price}
          </span>
        )}
        {product.source && (
          <span className="min-w-0 truncate text-right text-[11px] font-medium leading-4 text-white/70">
            {product.source}
          </span>
        )}
      </div>
    </button>
  );
}

function RemixOverlay({
  outfit,
  onClose,
  onSubmit,
}: {
  outfit: Outfit;
  onClose: () => void;
  onSubmit: (feedback: string) => Promise<void>;
}) {
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const imageUrl = getImageUrl(outfit);

  async function handleSubmit() {
    const trimmed = feedback.trim();
    if (!trimmed || submitting) return;

    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(trimmed);
    } catch (err) {
      console.error("Failed to submit remix:", err);
      setError("Could not remix this outfit. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="absolute inset-0 z-40 bg-black text-white">
      {imageUrl && (
        <img
          src={imageUrl}
          alt={outfit.name}
          className="absolute inset-0 h-full w-full object-cover opacity-30 blur-sm"
        />
      )}
      <div className="absolute inset-0 bg-black/70" />

      <div className="relative z-10 flex h-full flex-col px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-white/40">
              Remix
            </p>
            <h2 className="mt-1 max-w-[16rem] truncate text-lg font-semibold">
              {outfit.name}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 disabled:opacity-40"
            aria-label="Close remix"
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="flex flex-1 flex-col justify-center gap-5">
          <div>
            <h3 className="text-3xl font-semibold leading-tight">
              What should change?
            </h3>
            <p className="mt-3 text-sm leading-6 text-white/55">
              Tell us what to keep and what to adjust. We&apos;ll reuse matching
              products, research changes, and regenerate the look.
            </p>
          </div>

          <textarea
            value={feedback}
            onChange={(event) => setFeedback(event.target.value)}
            placeholder="I like it, but make the pants light jeans."
            rows={5}
            disabled={submitting}
            className="w-full resize-none rounded-3xl border border-white/10 bg-white/10 px-4 py-4 text-base leading-6 text-white outline-none placeholder:text-white/35 focus:border-white/30 disabled:opacity-60"
          />

          {error && <p className="text-sm text-red-300">{error}</p>}
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!feedback.trim() || submitting}
          className="flex h-14 w-full items-center justify-center rounded-full bg-white px-5 text-sm font-semibold text-black transition hover:bg-white/90 disabled:bg-white/20 disabled:text-white/40"
        >
          {submitting ? "Remixing..." : "Remix outfit"}
        </button>
      </div>
    </div>
  );
}

function BottomActionBar({
  canOpenProducts,
  onProducts,
  canRemix,
  onRemix,
  onNextOutfit,
}: {
  canOpenProducts: boolean;
  onProducts: () => void;
  canRemix: boolean;
  onRemix: () => void;
  onNextOutfit?: () => void;
}) {
  return (
    <div className="absolute inset-x-4 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-10 rounded-full bg-black/45 px-4 py-3 text-white shadow-2xl backdrop-blur-md">
      <div className="flex items-center justify-between">
        <ActionButton label="Like">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14 9V5a3 3 0 00-6 0v4H5a2 2 0 00-2 2v8a2 2 0 002 2h12.28a2 2 0 001.95-1.57l1.56-7A2 2 0 0018.84 10H14z"
          />
        </ActionButton>
        <ActionButton label="Dislike">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M10 15v4a3 3 0 006 0v-4h3a2 2 0 002-2V5a2 2 0 00-2-2H6.72a2 2 0 00-1.95 1.57l-1.56 7A2 2 0 005.16 14H10z"
          />
        </ActionButton>
        <ActionButton
          label="Products"
          disabled={!canOpenProducts}
          onClick={onProducts}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 7h18M6 7l1.2 12h9.6L18 7M9 7a3 3 0 016 0"
          />
        </ActionButton>
        <ActionButton label="Remix" disabled={!canRemix} onClick={onRemix}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M16.5 3.75L20.25 7.5m0 0l-3.75 3.75M20.25 7.5H8.75A5.75 5.75 0 003 13.25v.25M7.5 20.25L3.75 16.5m0 0l3.75-3.75M3.75 16.5h11.5A5.75 5.75 0 0021 10.75v-.25"
          />
        </ActionButton>
        <ActionButton label="Next outfit" onClick={onNextOutfit}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 9l7 7 7-7"
          />
        </ActionButton>
      </div>
    </div>
  );
}

function ActionButton({
  children,
  label,
  disabled = false,
  onClick,
}: {
  children: ReactNode;
  label: string;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="relative flex h-14 w-14 items-center justify-center rounded-full text-white transition hover:bg-white/10 disabled:text-white/30"
      aria-label={label}
      title={label}
    >
      <svg
        className="relative z-10 h-7 w-7"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        strokeWidth={2}
      >
        {children}
      </svg>
    </button>
  );
}
