"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  Thread,
  ThreadSummary,
  Outfit,
  User,
  SavedProduct,
  SearchResult,
} from "@/types/api";
import {
  useThreads,
  useThread,
  useThreadOutfits,
} from "@/lib/hooks";
import { apiClient } from "@/lib/api";

const LOCAL_USER_TOKEN_KEY = "curaitUserToken";
const TOKEN_CHANGE_EVENT = "curait-user-token-change";
let guestProvisionPromise: Promise<string | null> | null = null;

type AppView = "thread" | "saved" | "shopping" | "settings";

function readStoredUserId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(LOCAL_USER_TOKEN_KEY);
  } catch {
    return null;
  }
}

function useStoredUserId(): [string | null, boolean, (id: string | null) => void] {
  const [stored, setStored] = useState<string | null>(null);
  const [storageReady, setStorageReady] = useState(false);

  useEffect(() => {
    const syncFromStorage = () => {
      setStored(readStoredUserId());
      setStorageReady(true);
    };
    syncFromStorage();
    window.addEventListener("storage", syncFromStorage);
    window.addEventListener(TOKEN_CHANGE_EVENT, syncFromStorage);

    return () => {
      window.removeEventListener("storage", syncFromStorage);
      window.removeEventListener(TOKEN_CHANGE_EVENT, syncFromStorage);
    };
  }, []);

  const set = (id: string | null) => {
    try {
      if (id) localStorage.setItem(LOCAL_USER_TOKEN_KEY, id);
      else localStorage.removeItem(LOCAL_USER_TOKEN_KEY);
      setStored(id);
      window.dispatchEvent(new Event(TOKEN_CHANGE_EVENT));
    } catch {
      /* noop */
    }
  };

  return [stored, storageReady, set];
}

interface DataContextType {
  selectedUserId: string | null;
  selectedUser: User | null;
  refreshSelectedUser: () => Promise<void>;
  activeView: AppView;
  setActiveView: (view: AppView) => void;
  selectedThreadId: string | null;
  setSelectedThreadId: (threadId: string | null) => void;

  threads: {
    threads: ThreadSummary[];
    loading: boolean;
    refresh: () => Promise<void>;
  };
  thread: {
    thread: Thread | null;
    loading: boolean;
    refresh: () => Promise<void>;
  };
  outfits: {
    outfits: Outfit[];
    loading: boolean;
    refresh: () => Promise<void>;
  };
  savedOutfits: {
    outfits: Outfit[];
    loading: boolean;
    refresh: () => Promise<void>;
  };
  savedProducts: {
    products: SavedProduct[];
    loading: boolean;
    refresh: () => Promise<void>;
  };

  sendMessage: (threadId: string, messageText: string) => Promise<void>;
  createThread: (userId: string) => Promise<string>;
  deleteThread: (threadId: string) => Promise<void>;
  toggleOutfitSaved: (outfit: Outfit, saved: boolean) => Promise<void>;
  isProductSaved: (link?: string | null) => boolean;
  toggleProductSaved: (
    product: SearchResult,
    nextSaved: boolean,
    context?: { outfitId?: string | null; outfitItemId?: string | null }
  ) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function useDataContext() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useDataContext must be used within a DataProvider");
  return ctx;
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [storedUserId, storageReady, setStoredUserId] = useStoredUserId();
  const [activeView, setActiveView] = useState<AppView>("thread");
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [savedOutfitRows, setSavedOutfitRows] = useState<Outfit[]>([]);
  const [savedOutfitsLoading, setSavedOutfitsLoading] = useState(false);
  const [savedOverrides, setSavedOverrides] = useState<Record<string, boolean>>({});
  const [savedProductRows, setSavedProductRows] = useState<SavedProduct[]>([]);
  const [savedProductsLoading, setSavedProductsLoading] = useState(false);

  // First-visit bootstrap: create an anonymous user row and persist its id as
  // the local token. Onboarding completion is derived from that row's data.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!storageReady) return;
    if (storedUserId) return;

    (async () => {
      try {
        guestProvisionPromise ??= apiClient
          .createGuestUser()
          .then(({ user_id }) => user_id || null)
          .finally(() => {
            guestProvisionPromise = null;
          });
        const user_id = await guestProvisionPromise;
        if (user_id) setStoredUserId(user_id);
      } catch (err) {
        console.error("Failed to provision guest user:", err);
      }
    })();
  }, [storageReady, storedUserId, setStoredUserId]);

  const selectedUserId = storedUserId;

  const refreshSelectedUser = useCallback(async () => {
    if (!selectedUserId) {
      setSelectedUser(null);
      return;
    }

    const user = await apiClient.getUserProfile(selectedUserId);
    setSelectedUser(user);
  }, [selectedUserId]);

  useEffect(() => {
    if (!selectedUserId) {
      setSelectedUser(null);
      return;
    }

    let cancelled = false;
    apiClient.getUserProfile(selectedUserId).then((user) => {
      if (!cancelled) setSelectedUser(user);
    });

    return () => {
      cancelled = true;
    };
  }, [selectedUserId]);

  const threads = useThreads(selectedUserId);
  const thread = useThread(selectedThreadId);
  const threadOutfits = useThreadOutfits(selectedThreadId);
  const outfits = useMemo(
    () => ({
      ...threadOutfits,
      outfits: threadOutfits.outfits.map((outfit) =>
        outfit.id in savedOverrides
          ? { ...outfit, saved: savedOverrides[outfit.id] }
          : outfit
      ),
    }),
    [savedOverrides, threadOutfits],
  );

  const refreshSavedOutfits = useCallback(async () => {
    if (!selectedUserId) {
      setSavedOutfitRows([]);
      return;
    }

    setSavedOutfitsLoading(true);
    try {
      setSavedOutfitRows(await apiClient.listSavedOutfits(selectedUserId));
    } catch (error) {
      console.error("Failed to load saved outfits:", error);
      setSavedOutfitRows([]);
    } finally {
      setSavedOutfitsLoading(false);
    }
  }, [selectedUserId]);

  useEffect(() => {
    refreshSavedOutfits();
  }, [refreshSavedOutfits]);

  const refreshSavedProducts = useCallback(async () => {
    if (!selectedUserId) {
      setSavedProductRows([]);
      return;
    }

    setSavedProductsLoading(true);
    try {
      setSavedProductRows(await apiClient.listSavedProducts(selectedUserId));
    } catch (error) {
      console.error("Failed to load saved products:", error);
      setSavedProductRows([]);
    } finally {
      setSavedProductsLoading(false);
    }
  }, [selectedUserId]);

  useEffect(() => {
    refreshSavedProducts();
  }, [refreshSavedProducts]);

  const savedProductLinks = useMemo(
    () => new Set(savedProductRows.map((row) => row.link)),
    [savedProductRows],
  );

  const isProductSaved = useCallback(
    (link?: string | null) => Boolean(link && savedProductLinks.has(link)),
    [savedProductLinks],
  );

  const toggleProductSaved = useCallback(
    async (
      product: SearchResult,
      nextSaved: boolean,
      context?: { outfitId?: string | null; outfitItemId?: string | null },
    ) => {
      if (!selectedUserId) return;
      const link = product.link;
      if (!link) return;

      const previousRows = savedProductRows;
      const optimisticRow: SavedProduct = {
        id: `optimistic-${link}`,
        user_id: selectedUserId,
        outfit_id: context?.outfitId ?? null,
        outfit_item_id: context?.outfitItemId ?? null,
        link,
        title: product.title,
        price: product.price,
        image_url: product.imageUrl ?? null,
        source: product.source ?? null,
        product_id: product.productId ?? null,
        rating: product.rating ?? null,
        rating_count: null,
        api_provider: null,
        snapshot: product,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setSavedProductRows((current) =>
        nextSaved
          ? current.some((row) => row.link === link)
            ? current
            : [optimisticRow, ...current]
          : current.filter((row) => row.link !== link),
      );

      try {
        await apiClient.toggleSavedProduct(selectedUserId, {
          saved: nextSaved,
          product,
          outfit_id: context?.outfitId ?? null,
          outfit_item_id: context?.outfitItemId ?? null,
        });
        void refreshSavedProducts();
      } catch (error) {
        setSavedProductRows(previousRows);
        throw error;
      }
    },
    [refreshSavedProducts, savedProductRows, selectedUserId],
  );

  const sendMessage = async (threadId: string, messageText: string) => {
    await apiClient.sendChatMessage(threadId, messageText);
    // Immediate refresh; polling will continue to pick up subsequent changes.
    await Promise.all([thread.refresh(), outfits.refresh(), threads.refresh()]);
  };

  const createThread = async (uid: string) => {
    const res = await apiClient.createThread(uid);
    threads.refresh();
    return res.thread_id;
  };

  const deleteThread = async (threadId: string) => {
    await apiClient.deleteThread(threadId);
    if (selectedThreadId === threadId) {
      setSelectedThreadId(null);
    }
    threads.refresh();
  };

  const toggleOutfitSaved = async (outfit: Outfit, nextSaved: boolean) => {
    const previousSaved =
      savedOverrides[outfit.id] ?? Boolean(outfit.saved);

    setSavedOverrides((current) => ({ ...current, [outfit.id]: nextSaved }));
    setSavedOutfitRows((current) => {
      if (nextSaved) {
        return current.some((row) => row.id === outfit.id)
          ? current.map((row) =>
              row.id === outfit.id ? { ...row, saved: true } : row
            )
          : [{ ...outfit, saved: true }, ...current];
      }

      return current.filter((row) => row.id !== outfit.id);
    });

    try {
      await apiClient.setOutfitSaved(outfit.id, nextSaved);
      void refreshSavedOutfits();
    } catch (error) {
      setSavedOverrides((current) => ({
        ...current,
        [outfit.id]: previousSaved,
      }));
      setSavedOutfitRows((current) => {
        if (previousSaved) {
          return current.some((row) => row.id === outfit.id)
            ? current.map((row) =>
                row.id === outfit.id ? { ...row, saved: true } : row
              )
            : [{ ...outfit, saved: true }, ...current];
        }

        return current.filter((row) => row.id !== outfit.id);
      });
      throw error;
    }
  };

  const value: DataContextType = {
    selectedUserId,
    selectedUser,
    refreshSelectedUser,
    activeView,
    setActiveView,
    selectedThreadId,
    setSelectedThreadId,
    threads,
    thread,
    outfits,
    savedOutfits: {
      outfits: savedOutfitRows,
      loading: savedOutfitsLoading,
      refresh: refreshSavedOutfits,
    },
    savedProducts: {
      products: savedProductRows,
      loading: savedProductsLoading,
      refresh: refreshSavedProducts,
    },
    sendMessage,
    createThread,
    deleteThread,
    toggleOutfitSaved,
    isProductSaved,
    toggleProductSaved,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}
