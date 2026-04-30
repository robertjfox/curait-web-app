"use client";

export default function SettingsView({
  onMenuPress,
}: {
  onMenuPress?: () => void;
}) {
  function handleLogout() {
    try {
      localStorage.removeItem("curaitUserToken");
      window.dispatchEvent(new Event("curait-user-token-change"));
    } finally {
      window.location.reload();
    }
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
