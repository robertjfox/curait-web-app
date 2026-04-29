"use client";

import { useEffect, useState } from "react";
import { DataProvider, useDataContext } from "@/contexts/DataContext";
import Sidebar from "@/components/layout/Sidebar";
import ThreadView from "@/components/thread/ThreadView";
import OnboardingFlow from "@/components/onboarding/OnboardingFlow";
import SavedLooksView from "@/components/outfits/SavedLooksView";
import ShoppingListView from "@/components/products/ShoppingListView";
import type { User } from "@/types/api";

export default function Home() {
  return (
    <DataProvider>
      <MainLayout />
    </DataProvider>
  );
}

// On Android Chrome (and other browsers that honor the Fullscreen API on
// non-video elements), enter fullscreen on the user's first touch so the
// URL bar and toolbar are hidden entirely. iOS Safari ignores this call,
// which is fine — the document-scroll architecture still shrinks its
// chrome to a small pill on first scroll.
function useFullscreenOnFirstTouch() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.matchMedia("(pointer: coarse)").matches) return;

    const tryFullscreen = () => {
      const el = document.documentElement as HTMLElement & {
        requestFullscreen?: (options?: FullscreenOptions) => Promise<void>;
      };
      el.requestFullscreen?.({ navigationUI: "hide" }).catch(() => {});
      document.removeEventListener("touchend", tryFullscreen);
    };

    document.addEventListener("touchend", tryFullscreen, {
      once: true,
      passive: true,
    });

    return () => {
      document.removeEventListener("touchend", tryFullscreen);
    };
  }, []);
}

function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { activeView, selectedUserId, selectedUser, refreshSelectedUser } =
    useDataContext();
  const onboardingComplete = isUserOnboarded(selectedUser);

  useFullscreenOnFirstTouch();

  async function handleOnboardingComplete() {
    if (!selectedUserId) return;
    await refreshSelectedUser();
  }

  if (!selectedUserId) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-black px-6 text-center text-sm text-white/50">
        Setting up your profile...
      </div>
    );
  }

  if (!selectedUser) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-black px-6 text-center text-sm text-white/50">
        Loading your profile...
      </div>
    );
  }

  if (!onboardingComplete) {
    return (
      <OnboardingFlow
        userId={selectedUserId}
        onComplete={handleOnboardingComplete}
      />
    );
  }

  return (
    <div className="flex min-h-dvh bg-black">
      <Sidebar
        sidebarOpen={sidebarOpen}
        onCloseSidebar={() => setSidebarOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        {activeView === "saved" ? (
          <SavedLooksView />
        ) : activeView === "shopping" ? (
          <ShoppingListView />
        ) : (
          <ThreadView onMenuPress={() => setSidebarOpen(true)} />
        )}
      </div>
    </div>
  );
}

function isUserOnboarded(user: User | null): boolean {
  if (!user) return false;

  const firstName = user.first_name?.trim();
  if (!firstName || firstName.toLowerCase() === "guest") return false;
  if (!user.location?.trim() || !user.gender?.trim()) return false;

  const context = user.context ?? {};
  const hasStyleContext =
    Array.isArray(context.selected_brands) && context.selected_brands.length > 0;
  const hasBodyContext = Boolean(
    context.body_shape && (context.height_cm || context.height_feet) && context.weight_lb
  );

  return hasStyleContext && hasBodyContext;
}
