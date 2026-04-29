"use client";

import Image from "next/image";

interface HeaderProps {
  onMenuPress: () => void;
  threadTitle?: string;
  viewMode: "grid" | "feed";
  onViewModeToggle: () => void;
  showViewToggle?: boolean;
}

export default function Header({
  onMenuPress,
  threadTitle,
  viewMode,
  onViewModeToggle,
  showViewToggle = false,
}: HeaderProps) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-gray-200 bg-white px-4">
      {/* Mobile hamburger */}
      <button
        onClick={onMenuPress}
        className="rounded p-1.5 text-gray-500 hover:bg-gray-100 md:hidden"
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

      {/* Title */}
      {threadTitle ? (
        <h1 className="flex-1 truncate text-center text-sm font-semibold text-gray-800 md:text-left">
          {threadTitle}
        </h1>
      ) : (
        <div className="flex flex-1 justify-center md:justify-start">
          <Image
            src="/curait-logo.png"
            alt="CurAIt"
            width={112}
            height={35}
            className="h-7 w-auto"
            priority
          />
        </div>
      )}

      {/* View mode toggle */}
      {showViewToggle && (
        <div className="flex rounded-lg border border-gray-200 p-0.5">
          <button
            onClick={() => viewMode !== "grid" && onViewModeToggle()}
            className={`rounded-md px-2.5 py-1.5 transition-colors ${
              viewMode === "grid"
                ? "bg-blue-100 text-blue-700"
                : "text-gray-400 hover:text-gray-600"
            }`}
            aria-label="Grid view"
          >
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
                d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
              />
            </svg>
          </button>
          <button
            onClick={() => viewMode !== "feed" && onViewModeToggle()}
            className={`rounded-md px-2.5 py-1.5 transition-colors ${
              viewMode === "feed"
                ? "bg-blue-100 text-blue-700"
                : "text-gray-400 hover:text-gray-600"
            }`}
            aria-label="Feed view"
          >
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
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>
      )}
    </header>
  );
}
