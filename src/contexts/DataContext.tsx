"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Thread, ThreadSummary, Outfit, User } from "@/types/api";
import {
  useThreads,
  useThread,
  useThreadOutfits,
} from "@/lib/hooks";
import { apiClient } from "@/lib/api";

const LOCAL_USER_TOKEN_KEY = "curaitUserToken";
const TOKEN_CHANGE_EVENT = "curait-user-token-change";
let guestProvisionPromise: Promise<string | null> | null = null;

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

  sendMessage: (threadId: string, messageText: string) => Promise<void>;
  createThread: (userId: string) => Promise<string>;
  deleteThread: (threadId: string) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function useDataContext() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useDataContext must be used within a DataProvider");
  return ctx;
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [storedUserId, storageReady, setStoredUserId] = useStoredUserId();
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

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
  const outfits = useThreadOutfits(selectedThreadId);

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

  const value: DataContextType = {
    selectedUserId,
    selectedUser,
    refreshSelectedUser,
    selectedThreadId,
    setSelectedThreadId,
    threads,
    thread,
    outfits,
    sendMessage,
    createThread,
    deleteThread,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}
