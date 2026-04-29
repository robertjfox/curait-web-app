"use client";

import { useDataContext } from "@/contexts/DataContext";
import Image from "next/image";

interface SidebarProps {
  sidebarOpen: boolean;
  onCloseSidebar: () => void;
}

export default function Sidebar({ sidebarOpen, onCloseSidebar }: SidebarProps) {
  const {
    activeView,
    setActiveView,
    threads,
    selectedThreadId,
    setSelectedThreadId,
    deleteThread,
  } = useDataContext();

  function handleNewChat() {
    setActiveView("thread");
    setSelectedThreadId(null);
    onCloseSidebar();
  }

  function handleSelectThread(id: string) {
    setActiveView("thread");
    setSelectedThreadId(id);
    onCloseSidebar();
  }

  function handleSavedLooks() {
    setActiveView("saved");
    onCloseSidebar();
  }

  function handleDeleteThread(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    if (window.confirm("Delete this thread? This cannot be undone.")) {
      deleteThread(id);
    }
  }

  return (
    <>
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={onCloseSidebar}
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-white/10 bg-black text-white
          transition-transform duration-200 ease-in-out
          md:static md:translate-x-0
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="flex h-14 items-center justify-between border-b border-white/10 px-4">
          <Image
            src="/curait-logo.png"
            alt="CurAIt"
            width={128}
            height={40}
            className="h-8 w-auto invert"
            priority
          />
          <button
            onClick={onCloseSidebar}
            className="rounded p-1 text-white/45 hover:bg-white/10 hover:text-white md:hidden"
          >
            ✕
          </button>
        </div>

        <nav className="p-3">
          <button
            onClick={handleSavedLooks}
            className={`mb-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              activeView === "saved"
                ? "bg-white text-black"
                : "text-white/80 hover:bg-white/10 hover:text-white"
            }`}
          >
            <svg
              className="h-4 w-4"
              fill={activeView === "saved" ? "currentColor" : "none"}
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-4-7 4V5z"
              />
            </svg>
            Saved Looks
          </button>
          <button
            onClick={handleNewChat}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          >
            <span className="text-lg leading-none">+</span>
            New Chat
          </button>
        </nav>

        <div className="flex-1 overflow-y-auto border-t border-white/10 px-3 py-3">
          <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-white/40">
            Threads
          </p>
          {threads.loading ? (
            <div className="flex items-center justify-center py-8 text-sm text-white/40">
              Loading...
            </div>
          ) : threads.threads.length === 0 ? (
            <div className="py-8 text-center text-sm text-white/45">
              No conversations yet
            </div>
          ) : (
            <ul className="flex flex-col gap-0.5">
              {threads.threads.map((t) => (
                <li key={t.id} className="group relative">
                  <button
                    onClick={() => handleSelectThread(t.id)}
                    className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      activeView === "thread" && selectedThreadId === t.id
                        ? "bg-white text-black"
                        : "text-white/75 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <span className="block truncate">
                      {t.title || "Untitled"}
                    </span>
                  </button>
                  <button
                    onClick={(e) => handleDeleteThread(e, t.id)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-white/35 opacity-0 transition-opacity hover:bg-red-500/15 hover:text-red-300 group-hover:opacity-100"
                    title="Delete thread"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

      </aside>
    </>
  );
}
