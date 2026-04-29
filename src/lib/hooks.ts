"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ThreadSummary, Thread, Outfit, OutfitItem } from "@/types/api";
import { apiClient } from "@/lib/api";

const OUTFIT_ITEM_TYPE_ORDER = [
  "outerwear",
  "tops",
  "dresses",
  "bottoms",
  "footwear",
];

function sortOutfitItems(items: OutfitItem[]): OutfitItem[] {
  if (!items || items.length === 0) return items;
  return [...items].sort((a, b) => {
    const idxA = OUTFIT_ITEM_TYPE_ORDER.indexOf(a.type?.toLowerCase?.() ?? "");
    const idxB = OUTFIT_ITEM_TYPE_ORDER.indexOf(b.type?.toLowerCase?.() ?? "");
    const fA = idxA === -1 ? OUTFIT_ITEM_TYPE_ORDER.length : idxA;
    const fB = idxB === -1 ? OUTFIT_ITEM_TYPE_ORDER.length : idxB;
    return fA - fB;
  });
}

function sortOutfitsItems(outfits: Outfit[]): Outfit[] {
  return outfits.map((o) => ({
    ...o,
    outfit_items: o.outfit_items
      ? sortOutfitItems(o.outfit_items)
      : o.outfit_items,
  }));
}

/**
 * Repeatedly call `fetcher` while the page is visible. Pauses when the tab is
 * hidden so local development doesn't keep a hot polling loop in the background.
 */
function usePolling(
  fetcher: (() => Promise<void>) | null,
  intervalMs: number = 2500
) {
  const savedFetcher = useRef(fetcher);

  useEffect(() => {
    savedFetcher.current = fetcher;
  }, [fetcher]);

  useEffect(() => {
    if (!fetcher) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const tick = async () => {
      if (cancelled) return;
      if (typeof document !== "undefined" && document.hidden) {
        timer = setTimeout(tick, intervalMs);
        return;
      }
      try {
        await savedFetcher.current?.();
      } catch {
        /* swallow polling errors */
      }
      if (!cancelled) {
        timer = setTimeout(tick, intervalMs);
      }
    };

    timer = setTimeout(tick, intervalMs);

    const onVisible = () => {
      if (!document.hidden) {
        savedFetcher.current?.();
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [fetcher, intervalMs]);
}

export function useThreads(userId: string | null) {
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [loading, setLoading] = useState(false);
  // Only show `loading` for the very first fetch per userId. Background polls
  // must not flip it back to true, otherwise consumers (e.g. the sidebar) flash
  // a "Loading..." state every poll interval.
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    hasFetchedRef.current = false;
  }, [userId]);

  const refresh = useCallback(async () => {
    if (!userId) {
      setThreads([]);
      return;
    }
    const isInitial = !hasFetchedRef.current;
    try {
      if (isInitial) setLoading(true);
      const data = await apiClient.listUserThreads(userId);
      setThreads(data);
      hasFetchedRef.current = true;
    } catch (error) {
      console.error("Failed to load threads:", error);
      setThreads([]);
    } finally {
      if (isInitial) setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  usePolling(userId ? refresh : null, 10000);

  return { threads, loading, refresh };
}

export function useThread(threadId: string | null) {
  const [thread, setThread] = useState<Thread | null>(null);
  const [loading, setLoading] = useState(false);
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    hasFetchedRef.current = false;
  }, [threadId]);

  const refresh = useCallback(async () => {
    if (!threadId) {
      setThread(null);
      return;
    }
    const isInitial = !hasFetchedRef.current;
    try {
      if (isInitial) setLoading(true);
      const data = await apiClient.getThread(threadId);
      setThread(data);
      hasFetchedRef.current = true;
    } catch (err) {
      console.error("Failed to fetch thread:", err);
      setThread(null);
    } finally {
      if (isInitial) setLoading(false);
    }
  }, [threadId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  usePolling(threadId ? refresh : null, 4000);

  return { thread, loading, refresh };
}

export function useThreadOutfits(threadId: string | null) {
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [loading, setLoading] = useState(false);
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    hasFetchedRef.current = false;
  }, [threadId]);

  const refresh = useCallback(async () => {
    if (!threadId) {
      setOutfits([]);
      return;
    }
    const isInitial = !hasFetchedRef.current;
    try {
      if (isInitial) setLoading(true);
      const data = await apiClient.listThreadOutfits(threadId);
      setOutfits(sortOutfitsItems(data));
      hasFetchedRef.current = true;
    } catch (error) {
      console.error("Failed to load thread outfits:", error);
      setOutfits([]);
    } finally {
      if (isInitial) setLoading(false);
    }
  }, [threadId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  usePolling(threadId ? refresh : null, 4000);

  return { outfits, loading, refresh };
}
