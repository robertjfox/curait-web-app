"use client";

import { useEffect, useState } from "react";
import AvatarUploadPanel from "@/components/avatar/AvatarUploadPanel";
import { useDataContext } from "@/contexts/DataContext";
import { apiClient } from "@/lib/api";

export default function SettingsView({
  onMenuPress,
}: {
  onMenuPress?: () => void;
}) {
  const { selectedUserId, refreshSelectedUser } = useDataContext();
  const [editingAvatar, setEditingAvatar] = useState(false);
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [generatedAvatarUrl, setGeneratedAvatarUrl] = useState<string | null>(null);
  const [loadingAvatar, setLoadingAvatar] = useState(false);
  const [submittingAvatar, setSubmittingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  useEffect(() => {
    if (!editingAvatar || !selectedUserId) return;

    let cancelled = false;
    setLoadingAvatar(true);
    setAvatarError(null);

    apiClient
      .getCurrentAvatar(selectedUserId)
      .then((imageUrl) => {
        if (!cancelled) setCurrentAvatarUrl(imageUrl ? cacheBustUrl(imageUrl) : null);
      })
      .catch((error) => {
        console.error("Failed to load current avatar:", error);
        if (!cancelled) setAvatarError("Could not load your current avatar.");
      })
      .finally(() => {
        if (!cancelled) setLoadingAvatar(false);
      });

    return () => {
      cancelled = true;
    };
  }, [editingAvatar, selectedUserId]);

  function handleLogout() {
    try {
      localStorage.removeItem("curaitUserToken");
      window.dispatchEvent(new Event("curait-user-token-change"));
    } finally {
      window.location.reload();
    }
  }

  async function handleGenerateAvatar() {
    if (!selectedUserId || !selfie || submittingAvatar) return;

    setSubmittingAvatar(true);
    setAvatarError(null);
    try {
      const avatar = await apiClient.generateAvatar(selectedUserId, selfie);
      const imageUrl = cacheBustUrl(avatar.image_url);
      setGeneratedAvatarUrl(imageUrl);
      setCurrentAvatarUrl(imageUrl);
      await refreshSelectedUser();
    } catch (error) {
      console.error("Failed to update avatar:", error);
      setAvatarError("Could not create your avatar. Try another selfie.");
    } finally {
      setSubmittingAvatar(false);
    }
  }

  function resetAvatarEditor() {
    setSelfie(null);
    setGeneratedAvatarUrl(null);
    setAvatarError(null);
  }

  if (editingAvatar) {
    return (
      <div className="flex flex-1 flex-col overflow-y-auto bg-black px-5 py-8 text-white">
        <div className="mx-auto flex min-h-full w-full max-w-md flex-col">
          <div className="mb-6 flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => {
                resetAvatarEditor();
                setEditingAvatar(false);
              }}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/15"
              aria-label="Back to settings"
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
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <h1 className="text-2xl font-semibold">Edit avatar</h1>
            <div className="h-11 w-11" />
          </div>

          <div className="flex flex-1 flex-col justify-center">
            {loadingAvatar ? (
              <div className="flex h-80 items-center justify-center rounded-[2rem] bg-white/5 text-sm text-white/45">
                Loading avatar
              </div>
            ) : (
              <AvatarUploadPanel
                selfie={selfie}
                currentAvatarUrl={currentAvatarUrl}
                generatedAvatarUrl={generatedAvatarUrl}
                onSelfieChange={(nextSelfie) => {
                  setGeneratedAvatarUrl(null);
                  setSelfie(nextSelfie);
                  setAvatarError(null);
                }}
                onTryAgain={resetAvatarEditor}
              />
            )}

            {avatarError && (
              <p className="mt-4 text-center text-sm text-red-300">{avatarError}</p>
            )}
          </div>

          <div className="mt-6 flex gap-3">
            {generatedAvatarUrl ? (
              <button
                type="button"
                onClick={() => {
                  resetAvatarEditor();
                  setEditingAvatar(false);
                }}
                className="flex h-14 flex-1 items-center justify-center rounded-full bg-white px-5 text-sm font-semibold text-black transition hover:bg-white/90"
              >
                Approve avatar
              </button>
            ) : (
              <button
                type="button"
                onClick={handleGenerateAvatar}
                disabled={!selectedUserId || !selfie || submittingAvatar}
                className="flex h-14 flex-1 items-center justify-center rounded-full bg-white px-5 text-sm font-semibold text-black transition hover:bg-white/90 disabled:bg-white/20 disabled:text-white/40"
              >
                {submittingAvatar
                  ? "Creating avatar..."
                  : currentAvatarUrl
                    ? "Update avatar"
                    : "Create avatar"}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto bg-black px-5 py-8 text-white">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <h1 className="text-3xl font-semibold">Settings</h1>
          {onMenuPress && (
            <button
              type="button"
              onClick={onMenuPress}
              className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/15 md:hidden"
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
          )}
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-3">
          <button
            type="button"
            onClick={() => setEditingAvatar(true)}
            className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-medium text-white transition hover:bg-white/10"
          >
            <span>Edit avatar</span>
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.25 4.5l7.5 7.5-7.5 7.5"
              />
            </svg>
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-medium text-red-200 transition hover:bg-red-500/10 hover:text-red-100"
          >
            <span>Log out</span>
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6A2.25 2.25 0 005.25 5.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M18 12H9.75m0 0L12 9.75M9.75 12L12 14.25"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

function cacheBustUrl(url: string) {
  if (!url) return url;
  return `${url}${url.includes("?") ? "&" : "?"}v=${Date.now()}`;
}
