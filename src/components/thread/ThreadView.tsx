"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useDataContext } from "@/contexts/DataContext";
import { apiClient } from "@/lib/api";
import MessageInput from "@/components/thread/MessageInput";
import OutfitFeed from "@/components/outfits/OutfitFeed";
import LoadingScreen from "@/components/ui/LoadingScreen";
import type { Outfit, ThreadComment } from "@/types/api";

interface ThreadViewProps {
  onMenuPress: () => void;
}

interface GenerationCycle {
  threadId: string;
  startedAt: number;
  baselineOutfitIds: Set<string>;
  prompt: string;
  source: "message" | "remix";
}

interface PendingComment {
  id: string;
  threadId: string;
  message: string;
}

export default function ThreadView({ onMenuPress }: ThreadViewProps) {
  const {
    selectedUserId,
    selectedUser,
    selectedThreadId,
    setSelectedThreadId,
    thread,
    outfits,
    sendMessage,
    createThread,
    toggleOutfitSaved,
  } = useDataContext();

  const [sending, setSending] = useState(false);
  const [generation, setGeneration] = useState<GenerationCycle | null>(null);
  const [pendingComments, setPendingComments] = useState<PendingComment[]>([]);
  const [scrollToOutfitId, setScrollToOutfitId] = useState<string | null>(null);

  // Latest outfit list, kept in a ref so the send handler can snapshot the
  // baseline without re-binding every poll.
  const latestOutfitIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    latestOutfitIdsRef.current = new Set(outfits.outfits.map((o) => o.id));
  }, [outfits.outfits]);

  // Drop the progress strip when switching away from the thread that started it.
  useEffect(() => {
    if (generation && generation.threadId !== selectedThreadId) {
      setGeneration(null);
    }
  }, [generation, selectedThreadId]);

  const comments: ThreadComment[] = useMemo(
    () => thread.thread?.comments ?? [],
    [thread.thread]
  );

  const displayComments = useMemo(() => {
    const serverComments = comments.map((c, i) => ({
      id: `server-${c.timestamp}-${i}`,
      message: c.message,
    }));
    const optimisticComments = pendingComments
      .filter(
        (p) =>
          p.threadId === selectedThreadId &&
          !comments.some((c) => c.message === p.message)
      )
      .map((p) => ({ id: p.id, message: p.message }));

    return [...serverComments, ...optimisticComments];
  }, [comments, pendingComments, selectedThreadId]);

  const handleSendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    setSending(true);
    let optimisticCommentId: string | null = null;
    try {
      let threadId = selectedThreadId;
      if (!threadId) {
        if (!selectedUserId) return;
        threadId = await createThread(selectedUserId);
        setSelectedThreadId(threadId);
      }
      const pendingId = `${threadId}-${Date.now()}`;
      optimisticCommentId = pendingId;
      setPendingComments((prev) => [
        ...prev,
        { id: pendingId, threadId, message: trimmed },
      ]);
      setGeneration({
        threadId,
        startedAt: Date.now(),
        baselineOutfitIds: new Set(latestOutfitIdsRef.current),
        prompt: trimmed,
        source: "message",
      });
      await sendMessage(threadId, trimmed);
    } catch (error) {
      if (optimisticCommentId) {
        setPendingComments((prev) =>
          prev.filter((p) => p.id !== optimisticCommentId)
        );
      }
      console.error("Failed to send message:", error);
    } finally {
      setSending(false);
    }
  };

  const handleGenerateNextOutfit = () => {
    if (sending || waitingForFreshOutfit) return;
    const hiddenCachedOutfits = outfits.outfits.filter((outfit) => outfit.is_cached);
    if (!selectedThreadId || hiddenCachedOutfits.length === 0) {
      handleSendMessage(latestPrompt);
      return;
    }

    setSending(true);
    apiClient
      .revealNextOutfit(selectedThreadId)
      .then(async (result) => {
        if (result.revealed && result.outfit_id) {
          setScrollToOutfitId(result.outfit_id);
          await outfits.refresh();
        } else {
          await handleSendMessage(latestPrompt);
        }
      })
      .catch((error) => {
        console.error("Failed to reveal cached outfit:", error);
      })
      .finally(() => {
        setSending(false);
      });
  };

  const handleRemixOutfit = async (outfit: Outfit, feedback: string) => {
    const trimmed = feedback.trim();
    if (!trimmed || sending || waitingForFreshOutfit) return;

    setSending(true);
    try {
      setGeneration({
        threadId: outfit.thread_id,
        startedAt: Date.now(),
        baselineOutfitIds: new Set(latestOutfitIdsRef.current),
        prompt: trimmed,
        source: "remix",
      });
      const result = await apiClient.remixOutfit(outfit.id, trimmed);
      await outfits.refresh();
      if (result.outfit_id) {
        setScrollToOutfitId(result.outfit_id);
      }
      void thread.refresh();
    } catch (error) {
      setGeneration(null);
      console.error("Failed to remix outfit:", error);
      throw error;
    } finally {
      setSending(false);
    }
  };

  const latestPrompt =
    displayComments[displayComments.length - 1]?.message ||
    thread.thread?.title ||
    "What should we style next?";

  const freshOutfits = useMemo(
    () =>
      generation
        ? outfits.outfits.filter((o) => !generation.baselineOutfitIds.has(o.id))
        : [],
    [generation, outfits.outfits]
  );

  const waitingForFreshOutfit = Boolean(generation) && freshOutfits.length === 0;
  const firstName = selectedUser?.first_name?.trim();
  const promptSuggestions = (
    selectedUser?.prompt_suggestions?.prompts?.filter((prompt) => prompt.trim()) ??
    []
  ).slice(0, 3);
  const visibleOutfits = useMemo(
    () => outfits.outfits.filter((outfit) => !outfit.is_cached),
    [outfits.outfits]
  );

  if (!selectedThreadId) {
    return (
      <div className="relative flex flex-1 overflow-hidden bg-black text-white">
        <TopHud onMenuPress={onMenuPress} />

        <div className="flex flex-1 flex-col items-center justify-center px-7 text-center">
          <Image
            src="/curait-logo.png"
            alt="CurAIt"
            width={160}
            height={50}
            className="mb-8 h-10 w-auto invert"
            priority
          />
          <h1 className="max-w-sm text-4xl font-semibold leading-tight">
            {firstName ? (
              `Welcome back, ${firstName}.`
            ) : (
              <>
                Say the vibe.
                <br />
                Swipe the looks.
              </>
            )}
          </h1>
          {promptSuggestions.length > 0 && (
            <div className="mt-8 flex max-w-2xl flex-wrap justify-center gap-2">
              {promptSuggestions.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => handleSendMessage(prompt)}
                  disabled={sending || !selectedUserId}
                  className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-white/80 transition hover:border-white/30 hover:bg-white/15 hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="absolute inset-x-0 bottom-0 z-30">
          <MessageInput
            onSend={handleSendMessage}
            sending={sending || !selectedUserId}
            placeholder="Beach outfit"
            variant="floating"
          />
        </div>
      </div>
    );
  }

  if ((thread.loading || outfits.loading) && visibleOutfits.length === 0) {
    return (
      <div className="relative flex flex-1 overflow-hidden bg-black">
        <LoadingScreen />
      </div>
    );
  }

  return (
    <div className="relative flex flex-1 overflow-hidden bg-black">
      <OutfitFeed
        outfits={visibleOutfits}
        pendingPrompt={generation?.prompt || latestPrompt}
        isGenerating={waitingForFreshOutfit}
        actionsDisabled={sending || thread.loading || outfits.loading || waitingForFreshOutfit}
        autoScrollToPending={generation?.source !== "remix"}
        onGenerateNext={handleGenerateNextOutfit}
        onMenuPress={onMenuPress}
        onRemixOutfit={handleRemixOutfit}
        onToggleSaved={toggleOutfitSaved}
        scrollToOutfitId={scrollToOutfitId}
      />

      {visibleOutfits.length === 0 && !waitingForFreshOutfit && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-8 text-center text-white">
          <div>
            <p className="mb-3 text-sm font-medium uppercase tracking-[0.28em] text-white/45">
              Ready when you are
            </p>
            <h2 className="text-3xl font-semibold">Ask for your first look.</h2>
            {thread.loading && (
              <p className="mt-3 text-sm text-white/55">Loading thread...</p>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

function TopHud({
  onMenuPress,
}: {
  onMenuPress: () => void;
}) {
  return (
    <div className="absolute left-0 top-0 z-30 px-4 pt-[max(1rem,env(safe-area-inset-top))] text-white md:hidden">
      <button
        onClick={onMenuPress}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-black/35 backdrop-blur"
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
    </div>
  );
}
