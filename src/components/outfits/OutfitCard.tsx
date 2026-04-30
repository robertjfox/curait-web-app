"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  getImageBackedProducts,
  getProductImageUrl,
} from "@/lib/productImages";
import { useDataContext } from "@/contexts/DataContext";
import type { CSSProperties, ReactNode } from "react";
import type { Outfit, OutfitItem, SearchResult } from "@/types/api";

interface OutfitCardProps {
  outfit?: Outfit;
  loading?: boolean;
  prompt?: string;
  isActive?: boolean;
  isLatest?: boolean;
  shouldSimulateReveal?: boolean;
  onRevealComplete?: () => void;
  nextDisabled?: boolean;
  actionsDisabled?: boolean;
  onNextOutfit?: () => void;
  onMenuPress?: () => void;
  onRemixOutfit?: (outfit: Outfit, feedback: string) => Promise<void>;
  onToggleSaved?: (outfit: Outfit, saved: boolean) => Promise<void>;
}

// How long Next stays disabled with a circular countdown after a slide's
// flatlay first appears. Matches the CSS animation duration in globals.css
// (`@keyframes next-button-countdown`).
const NEXT_COOLDOWN_MS = 10_000;

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
  isLatest = false,
  shouldSimulateReveal = false,
  onRevealComplete,
  nextDisabled = false,
  actionsDisabled = false,
  onNextOutfit,
  onMenuPress,
  onRemixOutfit,
  onToggleSaved,
}: OutfitCardProps) {
  const [productsOpen, setProductsOpen] = useState(false);
  const [remixOpen, setRemixOpen] = useState(false);
  const [optimisticSaved, setOptimisticSaved] = useState<{
    outfitId: string;
    saved: boolean;
  } | null>(null);
  const [revealState, setRevealState] = useState<{
    outfitId: string | null;
    phase: "loading" | "collecting" | "image";
  }>({ outfitId: null, phase: "loading" });
  const imageUrl = getImageUrl(outfit);
  const items = useMemo(
    () => outfit?.outfit_items ?? [],
    [outfit?.outfit_items],
  );
  const simulateReveal = Boolean(
    outfit?.id &&
    isActive &&
    shouldSimulateReveal &&
    imageUrl &&
    !loading,
  );
  const revealPhase =
    simulateReveal && revealState.outfitId === outfit?.id
      ? revealState.phase
      : "loading";
  const displayImageUrl =
    imageUrl && !loading && (!simulateReveal || revealPhase !== "loading")
      ? imageUrl
      : null;
  const avatarRevealClass =
    simulateReveal && revealPhase === "collecting"
      ? "avatar-image-reveal"
      : "";
  const productPreviewImages = useMemo(
    () =>
      getImageBackedProducts(items.flatMap((item) => item.search_results ?? []))
        .map((product) => getProductImageUrl(product))
        .filter((url): url is string => Boolean(url))
        .slice(0, 3),
    [items],
  );
  const title = outfit?.name || prompt || "Your outfit";
  const isSaved =
    optimisticSaved && optimisticSaved.outfitId === outfit?.id
      ? optimisticSaved.saved
      : Boolean(outfit?.saved);

  useEffect(() => {
    if (!simulateReveal || !outfit?.id) return;

    const collectTimer = window.setTimeout(() => {
      setRevealState({ outfitId: outfit.id, phase: "collecting" });
    }, 2200);
    const imageTimer = window.setTimeout(() => {
      setRevealState({ outfitId: outfit.id, phase: "image" });
      onRevealComplete?.();
    }, 3400);

    return () => {
      window.clearTimeout(collectTimer);
      window.clearTimeout(imageTimer);
    };
  }, [onRevealComplete, outfit?.id, simulateReveal]);

  // Start the 10s "next" cooldown only on the latest slide, the moment
  // its flatlay image first paints. Older slides have already been seen,
  // so scrolling back to them shouldn't re-trigger the cooldown.
  const imageOnScreen = Boolean(displayImageUrl) && isActive && isLatest;
  const [cooldownActive, setCooldownActive] = useState(false);
  useEffect(() => {
    if (!imageOnScreen) return;
    setCooldownActive(true);
    const timer = window.setTimeout(
      () => setCooldownActive(false),
      NEXT_COOLDOWN_MS,
    );
    return () => window.clearTimeout(timer);
  }, [imageOnScreen]);

  return (
    <article className="relative flex h-full w-full flex-col overflow-hidden bg-[radial-gradient(circle_at_top,#2f2f2f,transparent_38%),linear-gradient(180deg,#101010,#050505)] text-white md:block">
      {displayImageUrl ? (
        <>
          <div className="slide-image-zoom relative flex-1 md:absolute md:inset-0">
            <img
              src={displayImageUrl}
              alt={title}
              className={`absolute inset-0 h-full w-full object-contain object-bottom md:hidden ${avatarRevealClass}`}
            />
            <div className="absolute inset-x-0 top-0 bottom-[6.25rem] hidden items-center justify-center px-4 pt-10 md:flex">
              <img
                src={displayImageUrl}
                alt={title}
                className={`max-h-full w-auto max-w-full rounded-2xl object-contain object-center ${avatarRevealClass}`}
              />
            </div>
          </div>
          {productPreviewImages.length > 0 && revealPhase === "collecting" && (
            <ProductCollectOverlay items={items} />
          )}
        </>
      ) : (
        <div className="relative flex-1 md:absolute md:inset-0">
          {items.length > 0 ? (
            <div className="flex h-full items-start px-5 pb-24 pt-5">
              <ProductPreviewRows items={items} />
            </div>
          ) : (
            <ConceptLoading />
          )}
        </div>
      )}

      <BottomActionBar
        className={
          displayImageUrl
            ? "md:left-1/2 md:right-auto md:w-[28rem] md:-translate-x-1/2"
            : "md:left-1/2 md:right-auto md:w-[28rem] md:-translate-x-1/2"
        }
        canOpenProducts={Boolean(outfit)}
        onProducts={() => outfit && setProductsOpen(true)}
        canRemix={Boolean(outfit && onRemixOutfit)}
        onRemix={() => outfit && onRemixOutfit && setRemixOpen(true)}
        onNextOutfit={onNextOutfit}
        isSaved={isSaved}
        canSave={Boolean(outfit && onToggleSaved)}
        actionsDisabled={loading || actionsDisabled}
        onSave={async () => {
          if (!outfit || !onToggleSaved) return;
          const nextSaved = !isSaved;
          setOptimisticSaved({ outfitId: outfit.id, saved: nextSaved });
          try {
            await onToggleSaved(outfit, nextSaved);
          } catch {
            setOptimisticSaved({ outfitId: outfit.id, saved: isSaved });
          }
        }}
        nextDisabled={loading || nextDisabled || simulateReveal || cooldownActive}
        nextCountdown={cooldownActive}
        onMenuPress={onMenuPress}
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
  const overlayRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!collecting || !overlayRef.current) return;

    const viewport = window.visualViewport;
    const viewportLeft = viewport?.offsetLeft ?? 0;
    const viewportTop = viewport?.offsetTop ?? 0;
    const viewportWidth = viewport?.width ?? window.innerWidth;
    const viewportHeight = viewport?.height ?? window.innerHeight;
    const targetX = viewportLeft + viewportWidth / 2;
    const targetY = viewportTop + viewportHeight - 36;

    overlayRef.current
      .querySelectorAll<HTMLElement>("[data-collect-tile]")
      .forEach((tile) => {
        const tileRect = tile.getBoundingClientRect();
        const tileCenterX = tileRect.left + tileRect.width / 2;
        const tileCenterY = tileRect.top + tileRect.height / 2;
        tile.style.setProperty("--collect-x", `${targetX - tileCenterX}px`);
        tile.style.setProperty("--collect-y", `${targetY - tileCenterY}px`);
      });
  }, [collecting, items]);

  return (
    <div
      ref={overlayRef}
      className={`mx-auto w-full space-y-5 md:max-w-[27rem] md:space-y-4 ${
        collecting ? "overflow-visible" : "overflow-hidden"
      }`}
    >
      {items.map((item, rowIndex) => {
        const products = getImageBackedProducts(
          item.search_results ?? [],
        ).slice(0, 3);
        const hasResults = (item.search_results?.length ?? 0) > 0;
        const isRanked = (item.search_results ?? []).some(
          (product) => typeof product.ranking === "number",
        );
        const state = !hasResults
          ? "Searching"
          : !isRanked
            ? "Ranking"
            : "Ready";

        return (
          <div key={item.id} className="space-y-2">
            <div
              className={`flex items-center justify-between gap-3 ${
                collecting ? "product-keyword-collect-out" : ""
              }`}
            >
              <p className="truncate text-left text-xs font-medium uppercase tracking-[0.18em] text-white/55">
                {item.title || cleanSearchTerm(item.keywords) || item.type}
              </p>
              {state !== "Ready" && (
                <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-white/45">
                  {state}
                </span>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2 md:flex md:justify-center md:gap-3">
              {[0, 1, 2].map((index) => {
                const product = products[index];
                const imageUrl = product ? getProductImageUrl(product) : null;

                if (imageUrl) {
                  return (
                    <div
                      key={`${product?.link || item.id}-${index}`}
                      data-collect-tile={collecting ? "" : undefined}
                      className={`aspect-square overflow-hidden rounded-xl bg-white/10 shadow-2xl md:h-32 md:w-32 md:shrink-0 ${
                        collecting ? "product-collect-to-button" : ""
                      }`}
                      style={
                        collecting
                          ? ({
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
                    className="flex aspect-square items-center justify-center rounded-xl bg-white/10 shadow-2xl md:h-32 md:w-32 md:shrink-0"
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
    <div className="product-collect-overlay pointer-events-none fixed inset-0 z-20 bg-black/10 md:absolute">
      <div className="flex h-full items-start px-5 pb-24 pt-5 md:pt-24">
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
      <button
        type="button"
        onClick={onClose}
        className="absolute right-5 top-[max(1rem,env(safe-area-inset-top))] z-20 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/20 md:right-6"
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

      <div className="h-full overflow-y-auto px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[calc(max(1rem,env(safe-area-inset-top))+3.75rem)] scrollbar-hide md:px-6">
        {items.length > 0 ? (
          <ProductBrowserRows outfitId={outfit.id} items={items} />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-white/45">
            Finding products...
          </div>
        )}
      </div>
    </div>
  );
}

function ProductBrowserRows({
  outfitId,
  items,
}: {
  outfitId: string;
  items: OutfitItem[];
}) {
  return (
    <div className="mx-auto w-full space-y-7 md:max-w-5xl md:space-y-6">
      {items.map((item) => {
        const products = getImageBackedProducts(item.search_results ?? []);

        return (
          <div key={item.id} className="space-y-2.5">
            <p className="truncate text-left text-xs font-medium uppercase tracking-[0.18em] text-white/55">
              {item.title || cleanSearchTerm(item.keywords) || item.type}
            </p>

            {products.length > 0 ? (
              <div className="grid grid-cols-3 gap-2 md:flex md:gap-3 md:overflow-x-auto md:pb-2 md:scrollbar-hide">
                {products.map((product, index) => (
                  <ProductTile
                    key={`${product.link || product.title}-${index}`}
                    product={product}
                    outfitId={outfitId}
                    outfitItemId={item.id}
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 md:flex md:gap-3 md:overflow-x-auto md:pb-2 md:scrollbar-hide">
                {[0, 1, 2].map((index) => (
                  <div
                    key={`${item.id}-empty-${index}`}
                    className="flex aspect-square items-center justify-center rounded-xl bg-white/10 md:h-36 md:w-36 md:shrink-0"
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

function ProductTile({
  product,
  outfitId,
  outfitItemId,
}: {
  product: SearchResult;
  outfitId?: string;
  outfitItemId?: string;
}) {
  const { isProductSaved, toggleProductSaved } = useDataContext();
  const imageUrl = getProductImageUrl(product);
  const price = product.price?.split(".")[0];

  const initialSaved = isProductSaved(product.link);
  const [optimisticSaved, setOptimisticSaved] = useState<boolean | null>(null);
  const [pending, setPending] = useState(false);
  const saved = optimisticSaved ?? initialSaved;

  if (!imageUrl) return null;

  function openProduct() {
    if (product.link) {
      window.open(product.link, "_blank", "noopener,noreferrer");
    }
  }

  async function handleToggleSaved(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (pending || !product.link) return;
    const next = !saved;
    setOptimisticSaved(next);
    setPending(true);
    try {
      await toggleProductSaved(product, next, {
        outfitId,
        outfitItemId,
      });
    } catch {
      setOptimisticSaved(!next);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="group relative md:w-36 md:shrink-0">
      <button
        type="button"
        onClick={openProduct}
        className="block w-full text-left"
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

      <button
        type="button"
        onClick={handleToggleSaved}
        disabled={pending || !product.link}
        aria-label={saved ? "Unsave product" : "Save product"}
        aria-pressed={saved}
        className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_1px_2px_rgba(0,0,0,0.25)] ring-1 ring-inset ring-white/25 backdrop-blur-md backdrop-saturate-150 transition hover:bg-black/35 disabled:opacity-60"
      >
        <svg
          className={`h-3.5 w-3.5 drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)] transition ${saved ? "text-red-400" : "text-white"}`}
          viewBox="0 0 24 24"
          fill={saved ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth={2.25}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"
          />
        </svg>
      </button>
    </div>
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

      <button
        type="button"
        onClick={onClose}
        disabled={submitting}
        className="absolute right-5 top-[max(1rem,env(safe-area-inset-top))] z-20 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 disabled:opacity-40"
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

      <div className="relative z-10 flex h-full items-center justify-center px-5 py-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="flex w-full max-w-xl flex-col gap-5">
          <h3 className="text-center text-3xl font-semibold leading-tight">
            Tell us what to change
          </h3>

          <textarea
            value={feedback}
            onChange={(event) => setFeedback(event.target.value)}
            placeholder="Sneakers instead of shoes, make the pants jeans, less formal, etc."
            rows={5}
            disabled={submitting}
            className="w-full resize-none rounded-3xl border border-white/10 bg-white/10 px-4 py-4 text-base leading-6 text-white outline-none placeholder:text-white/35 focus:border-white/30 disabled:opacity-60"
          />

          {error && <p className="text-sm text-red-300">{error}</p>}

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
    </div>
  );
}

function BottomActionBar({
  className = "",
  contained = false,
  canOpenProducts,
  onProducts,
  canRemix,
  onRemix,
  onNextOutfit,
  isSaved,
  canSave,
  onSave,
  actionsDisabled,
  nextDisabled,
  nextCountdown,
  onMenuPress,
}: {
  className?: string;
  contained?: boolean;
  canOpenProducts: boolean;
  onProducts: () => void;
  canRemix: boolean;
  onRemix: () => void;
  onNextOutfit?: () => void;
  isSaved: boolean;
  canSave: boolean;
  onSave: () => void;
  actionsDisabled: boolean;
  nextDisabled: boolean;
  nextCountdown: boolean;
  onMenuPress?: () => void;
}) {
  return (
    <div
      className={`${
        contained
          ? "relative"
          : "relative mx-4 h-20 shrink-0 md:absolute md:inset-x-4 md:bottom-[max(0.75rem,env(safe-area-inset-bottom))] md:mx-0"
      } z-10 rounded-full bg-black/45 px-4 text-white shadow-2xl backdrop-blur-md ${className}`}
    >
      <div className="flex h-full items-center justify-between">
        {onMenuPress && (
          <ActionButton
            label="Open menu"
            onClick={onMenuPress}
            className="md:hidden"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 6h16M4 12h16M4 18h16"
            />
          </ActionButton>
        )}
        <ActionButton
          label={isSaved ? "Unsave look" : "Save look"}
          disabled={actionsDisabled || !canSave}
          active={isSaved}
          onClick={onSave}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14 9V5a3 3 0 00-6 0v4H5a2 2 0 00-2 2v8a2 2 0 002 2h12.28a2 2 0 001.95-1.57l1.56-7A2 2 0 0018.84 10H14z"
          />
        </ActionButton>
        <ActionButton
          label="Products"
          disabled={actionsDisabled || !canOpenProducts}
          onClick={onProducts}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6 7h12l-1.2 12.2A2 2 0 0114.8 21H9.2a2 2 0 01-2-1.8L6 7zM9 7V5.5a3 3 0 016 0V7"
          />
        </ActionButton>
        <ActionButton
          label="Remix"
          disabled={actionsDisabled || !canRemix}
          onClick={onRemix}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M16.5 3.75L20.25 7.5m0 0l-3.75 3.75M20.25 7.5H8.75A5.75 5.75 0 003 13.25v.25M7.5 20.25L3.75 16.5m0 0l3.75-3.75M3.75 16.5h11.5A5.75 5.75 0 0021 10.75v-.25"
          />
        </ActionButton>
        <ActionButton
          label="Next outfit"
          disabled={actionsDisabled || nextDisabled || !onNextOutfit}
          countdown={nextCountdown}
          onClick={onNextOutfit}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 9l7 7 7-7" />
        </ActionButton>
      </div>
    </div>
  );
}

function ActionButton({
  children,
  label,
  disabled = false,
  active = false,
  countdown = false,
  onClick,
  className = "",
}: {
  children: ReactNode;
  label: string;
  disabled?: boolean;
  active?: boolean;
  countdown?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`relative flex h-14 w-14 items-center justify-center rounded-full transition hover:bg-white/10 disabled:text-white/30 ${
        active ? "bg-white text-black hover:bg-white/90" : "text-white"
      } ${className}`}
      aria-label={label}
      title={label}
    >
      {countdown && (
        <svg
          className="next-button-countdown pointer-events-none absolute inset-0 h-full w-full text-white"
          viewBox="0 0 56 56"
          aria-hidden="true"
        >
          <circle
            className="next-button-countdown-track"
            cx="28"
            cy="28"
            r="25"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
          <circle
            className="next-button-countdown-progress"
            cx="28"
            cy="28"
            r="25"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
      )}
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
