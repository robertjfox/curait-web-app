export default function LoadingScreen() {
  return (
    <div className="flex h-full min-h-[100dvh] w-full items-center justify-center bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.16),rgba(255,255,255,0.04)_24%,transparent_48%),linear-gradient(180deg,#070707,#000)]">
      <svg
        className="h-7 w-7 animate-spin text-white/45"
        fill="none"
        viewBox="0 0 24 24"
        aria-label="Loading"
      >
        <circle
          className="opacity-20"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-80"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
        />
      </svg>
    </div>
  );
}
