"use client";

import { useMemo } from "react";
import type { Outfit, OutfitItem } from "@/types/api";

type StepStatus = "pending" | "active" | "completed";

interface GenerationProgressProps {
  /**
   * Outfit ids that already existed when the user sent their latest message.
   * Anything outside this set counts as "newly generated" output.
   */
  baselineOutfitIds: Set<string>;
  /** Wall-clock timestamp when the user sent their latest message. */
  startedAt: number;
  /** Latest polled outfits for the thread. */
  outfits: Outfit[];
  /** Number of outfit columns to reserve while new outfits stream in. */
  columnCount?: number;
}

function getImageUrl(outfit: Outfit): string | null {
  return outfit.default_rendering_url || outfit.vton_image_url || null;
}

function hasProducts(item: OutfitItem): boolean {
  return (item.search_results?.length ?? 0) > 0;
}

function hasRankedProducts(item: OutfitItem): boolean {
  return (item.search_results ?? []).some((r) => typeof r.ranking === "number");
}

export default function GenerationProgress({
  baselineOutfitIds,
  outfits,
  columnCount = 3,
}: GenerationProgressProps) {
  const freshOutfits = useMemo(
    () =>
      outfits
        .filter((o) => !baselineOutfitIds.has(o.id))
        .sort((a, b) => (a.outfit_order ?? 0) - (b.outfit_order ?? 0)),
    [outfits, baselineOutfitIds]
  );

  const columns = Array.from({ length: columnCount }, (_, i) => freshOutfits[i]);
  const generated = freshOutfits.length > 0;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 py-3">
      <div className="flex items-center gap-3 text-sm">
        <StepIcon status={generated ? "completed" : "active"} />
        <span className={generated ? "text-gray-700" : "text-gray-900"}>
          {generated ? "Generated outfit ideas" : "Generating outfit ideas"}
        </span>
      </div>

      {generated && (
        <div className="grid gap-4 md:grid-cols-3">
          {columns.map((outfit, index) =>
            outfit ? (
              <OutfitProgressColumn key={outfit.id} outfit={outfit} />
            ) : (
              <PendingOutfitColumn key={`pending-${index}`} index={index} />
            )
          )}
        </div>
      )}
    </div>
  );
}

function OutfitProgressColumn({ outfit }: { outfit: Outfit }) {
  const items = outfit.outfit_items ?? [];
  const searched =
    items.length > 0 && items.every((item) => hasProducts(item));
  const ranked =
    items.length > 0 && items.every((item) => hasRankedProducts(item));
  const imageUrl = getImageUrl(outfit);

  return (
    <article className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-3 py-2">
        <p className="truncate text-sm font-medium text-gray-900">
          {outfit.name || "Outfit"}
        </p>
      </div>

      <div className="space-y-3 p-3">
        <MiniStep
          status={searched ? "completed" : "active"}
          label={searched ? "Products found" : "Searching products"}
        />

        <div className="grid grid-cols-4 gap-2">
          {items.length === 0
            ? [1, 2, 3, 4].map((i) => <ProductThumbSkeleton key={i} />)
            : items.map((item) => (
                <ProductThumb key={item.id} item={item} />
              ))}
        </div>

        <MiniStep
          status={ranked ? "completed" : searched ? "active" : "pending"}
          label={ranked ? "Products ranked" : "Ranking products"}
        />

        <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-gray-100">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={outfit.name || "Outfit"}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-gray-400">
              <svg
                className="h-5 w-5 animate-spin"
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
              <span className="text-xs font-medium">Generating image</span>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function PendingOutfitColumn({ index }: { index: number }) {
  return (
    <article className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-3">
      <div className="mb-3 h-4 w-24 rounded bg-gray-200" />
      <MiniStep status="pending" label={`Outfit ${index + 1}`} />
      <div className="mt-3 aspect-[3/4] rounded-xl bg-white" />
    </article>
  );
}

function MiniStep({
  status,
  label,
}: {
  status: StepStatus;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 text-xs text-gray-600">
      <StepIcon status={status} size="sm" />
      <span
        className={
          status === "pending"
            ? "text-gray-400"
            : status === "active"
              ? "text-gray-900"
              : "text-gray-600"
        }
      >
        {label}
      </span>
    </div>
  );
}

function ProductThumb({ item }: { item: OutfitItem }) {
  const firstResult = item.search_results?.[0];
  const imageUrl = firstResult?.imageUrl;

  if (!imageUrl) return <ProductThumbSkeleton label={item.type} />;

  return (
    <div className="overflow-hidden rounded-lg border border-gray-100 bg-gray-50">
      <img
        src={imageUrl}
        alt={firstResult.title || item.type}
        className="aspect-square w-full object-cover"
      />
    </div>
  );
}

function ProductThumbSkeleton({ label }: { label?: string }) {
  return (
    <div className="flex aspect-square items-center justify-center rounded-lg bg-gray-100">
      {label ? (
        <span className="max-w-full truncate px-1 text-[10px] text-gray-400">
          {label}
        </span>
      ) : (
        <span className="h-4 w-4 animate-pulse rounded-full bg-gray-200" />
      )}
    </div>
  );
}

function StepIcon({
  status,
  size = "md",
}: {
  status: StepStatus;
  size?: "sm" | "md";
}) {
  const wrapperClass =
    size === "sm"
      ? "flex h-4 w-4 shrink-0 items-center justify-center"
      : "flex h-5 w-5 shrink-0 items-center justify-center";

  if (status === "completed") {
    return (
      <span className={`${wrapperClass} rounded-full bg-blue-600 text-white`}>
        <svg
          className={size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3"}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={3}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 13l4 4L19 7"
          />
        </svg>
      </span>
    );
  }

  if (status === "active") {
    return (
      <span className={wrapperClass}>
        <svg
          className={`animate-spin text-blue-600 ${
            size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"
          }`}
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      </span>
    );
  }

  return (
    <span className={wrapperClass}>
      <span className="h-2 w-2 rounded-full bg-gray-300" />
    </span>
  );
}
