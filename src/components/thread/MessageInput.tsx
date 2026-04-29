"use client";

import { useState, useRef, useCallback, type KeyboardEvent } from "react";

interface MessageInputProps {
  onSend: (message: string) => void;
  sending: boolean;
  placeholder?: string;
  disabled?: boolean;
  variant?: "default" | "floating";
}

export default function MessageInput({
  onSend,
  sending,
  placeholder = "Describe an outfit or ask for styling advice…",
  disabled = false,
  variant = "default",
}: MessageInputProps) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const canSend = text.trim().length > 0 && !sending && !disabled;

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || sending || disabled) return;
    onSend(trimmed);
    setText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [text, sending, disabled, onSend]);

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleInput() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
  }

  const isFloating = variant === "floating";

  return (
    <div
      className={
        isFloating
          ? "px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
          : "border-t border-gray-200 bg-white px-4 py-3"
      }
    >
      <div className="mx-auto flex max-w-3xl items-end gap-2">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            handleInput();
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          disabled={sending || disabled}
          className={`min-h-10 max-h-32 flex-1 resize-none rounded-2xl px-4 py-2.5 text-sm focus:outline-none disabled:opacity-50 ${
            isFloating
              ? "border border-white/15 bg-black/55 text-white placeholder-white/60 shadow-2xl backdrop-blur-md focus:border-white/40"
              : "border border-gray-300 bg-gray-50 text-gray-900 placeholder-gray-400 focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
          }`}
        />
        <button
          onClick={handleSend}
          disabled={!canSend}
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors ${
            canSend
              ? isFloating
                ? "bg-white text-black hover:bg-white/90"
                : "bg-blue-600 text-white hover:bg-blue-700"
              : isFloating
                ? "bg-white/15 text-white/40"
                : "bg-gray-200 text-gray-400"
          }`}
          aria-label="Send message"
        >
          {sending ? (
            <svg
              className="h-4 w-4 animate-spin"
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
          ) : (
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
                d="M5 12h14M12 5l7 7-7 7"
              />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
