"use client";

import { useEffect, useMemo, useState } from "react";

interface AvatarUploadPanelProps {
  selfie: File | null;
  generatedAvatarUrl?: string | null;
  currentAvatarUrl?: string | null;
  onSelfieChange: (selfie: File | null) => void;
  onTryAgain: () => void;
  instruction?: string;
}

export default function AvatarUploadPanel({
  selfie,
  generatedAvatarUrl,
  currentAvatarUrl,
  onSelfieChange,
  onTryAgain,
  instruction = "Take a clear face selfie.",
}: AvatarUploadPanelProps) {
  const [failedAvatarUrl, setFailedAvatarUrl] = useState<string | null>(null);
  const selfiePreview = useMemo(
    () => (selfie ? URL.createObjectURL(selfie) : null),
    [selfie]
  );

  useEffect(() => {
    return () => {
      if (selfiePreview) URL.revokeObjectURL(selfiePreview);
    };
  }, [selfiePreview]);

  const previewUrl =
    selfiePreview ||
    (currentAvatarUrl && failedAvatarUrl !== currentAvatarUrl
      ? currentAvatarUrl
      : null);

  return (
    <div className="space-y-4">
      <p className="text-center text-sm leading-6 text-white/55">
        {instruction}
      </p>

      {generatedAvatarUrl ? (
        <div className="rounded-[2rem] border border-white/10 bg-white/10 p-3">
          <div className="flex h-80 items-center justify-center overflow-hidden rounded-[1.5rem] bg-white/10">
            <img
              src={generatedAvatarUrl}
              alt="Generated avatar"
              className="h-full w-full object-contain"
            />
          </div>
          <button
            type="button"
            onClick={onTryAgain}
            className="mt-3 flex h-12 w-full items-center justify-center rounded-full border border-white/15 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Try again
          </button>
        </div>
      ) : (
        <label className="block cursor-pointer rounded-[2rem] border border-white/10 bg-white/10 p-3 transition hover:bg-white/[0.13]">
          <div className="flex h-72 items-center justify-center overflow-hidden rounded-[1.5rem] bg-white/10">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt={selfiePreview ? "Selfie preview" : "Current avatar"}
                onError={() => {
                  if (currentAvatarUrl) setFailedAvatarUrl(currentAvatarUrl);
                }}
                className={`h-full w-full ${
                  selfiePreview ? "object-cover" : "object-contain"
                }`}
              />
            ) : (
              <span className="text-sm font-medium text-white/40">Face</span>
            )}
          </div>
          <span className="mt-3 flex h-12 items-center justify-center rounded-full bg-white text-sm font-semibold text-black">
            {currentAvatarUrl && !selfie ? "Upload new selfie" : "Take or upload selfie"}
          </span>
          <input
            type="file"
            accept="image/*"
            capture="user"
            onChange={(event) => onSelfieChange(event.target.files?.[0] ?? null)}
            className="sr-only"
          />
        </label>
      )}
    </div>
  );
}
