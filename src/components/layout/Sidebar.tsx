"use client";

import { useDataContext } from "@/contexts/DataContext";
import Image from "next/image";

interface SidebarProps {
  sidebarOpen: boolean;
  onCloseSidebar: () => void;
}

export default function Sidebar({ sidebarOpen, onCloseSidebar }: SidebarProps) {
  const {
    threads,
    selectedThreadId,
    setSelectedThreadId,
    deleteThread,
  } = useDataContext();

  function handleNewChat() {
    setSelectedThreadId(null);
    onCloseSidebar();
  }

  function handleSelectThread(id: string) {
    setSelectedThreadId(id);
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
          fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-gray-200 bg-white text-gray-900
          transition-transform duration-200 ease-in-out
          md:static md:translate-x-0
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="flex h-14 items-center justify-between border-b border-gray-200 px-4">
          <Image
            src="/curait-logo.png"
            alt="CurAIt"
            width={128}
            height={40}
            className="h-8 w-auto"
            priority
          />
          <button
            onClick={onCloseSidebar}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 md:hidden"
          >
            ✕
          </button>
        </div>

        <nav className="p-3">
          <button
            onClick={handleNewChat}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
          >
            <span className="text-lg leading-none">+</span>
            New Chat
          </button>
        </nav>

        <div className="flex-1 overflow-y-auto border-t border-gray-200 px-3 py-2">
          <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-gray-500">
            Threads
          </p>
          {threads.loading ? (
            <div className="flex items-center justify-center py-8 text-sm text-gray-400">
              Loading...
            </div>
          ) : threads.threads.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-500">
              No conversations yet
            </div>
          ) : (
            <ul className="flex flex-col gap-0.5">
              {threads.threads.map((t) => (
                <li key={t.id} className="group relative">
                  <button
                    onClick={() => handleSelectThread(t.id)}
                    className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      selectedThreadId === t.id
                        ? "bg-blue-600 text-white"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <span className="block truncate">
                      {t.title || "Untitled"}
                    </span>
                  </button>
                  <button
                    onClick={(e) => handleDeleteThread(e, t.id)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 opacity-0 transition-opacity hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
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
