"use client";

import { useState } from "react";
import { DataProvider, useDataContext } from "@/contexts/DataContext";
import Sidebar from "@/components/layout/Sidebar";
import ThreadView from "@/components/thread/ThreadView";
import LandingPage from "@/components/landing/LandingPage";
import OnboardingFlow from "@/components/onboarding/OnboardingFlow";
import SavedLooksView from "@/components/outfits/SavedLooksView";
import ShoppingListView from "@/components/products/ShoppingListView";
import SettingsView from "@/components/settings/SettingsView";
import LoadingScreen from "@/components/ui/LoadingScreen";
import type { User } from "@/types/api";

export default function Home() {
  return (
    <DataProvider>
      <MainLayout />
    </DataProvider>
  );
}

function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [landingSeen, setLandingSeen] = useState(false);
  const [onboardingFinished, setOnboardingFinished] = useState(false);
  const { activeView, selectedUserId, selectedUser, refreshSelectedUser } =
    useDataContext();
  const onboardingComplete = isUserOnboarded(selectedUser);
  const profilePending =
    selectedUser?.context?.style_context_synthesis_status === "pending";

  async function handleOnboardingComplete() {
    if (!selectedUserId) return;
    setOnboardingFinished(true);
    await refreshSelectedUser();
  }

  if (!selectedUserId) {
    return <LoadingScreen />;
  }

  if (!selectedUser) {
    return <LoadingScreen />;
  }

  if (!onboardingComplete || (landingSeen && !onboardingFinished)) {
    if (!landingSeen && !onboardingComplete) {
      return <LandingPage onStart={() => setLandingSeen(true)} />;
    }

    return (
      <OnboardingFlow
        userId={selectedUserId}
        onComplete={handleOnboardingComplete}
      />
    );
  }

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-black">
      <Sidebar
        sidebarOpen={sidebarOpen}
        onCloseSidebar={() => setSidebarOpen(false)}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        {activeView === "saved" ? (
          <SavedLooksView onMenuPress={() => setSidebarOpen(true)} />
        ) : activeView === "shopping" ? (
          <ShoppingListView onMenuPress={() => setSidebarOpen(true)} />
        ) : activeView === "settings" ? (
          <SettingsView onMenuPress={() => setSidebarOpen(true)} />
        ) : (
          <ThreadView onMenuPress={() => setSidebarOpen(true)} />
        )}
      </div>
      {profilePending && <ProfilePendingNotice />}
    </div>
  );
}

function ProfilePendingNotice() {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-[max(1rem,env(safe-area-inset-top))] z-50 flex justify-center px-4">
      <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/55 px-4 py-2 text-xs font-medium text-white/75 shadow-2xl backdrop-blur">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
        Building your personal profile
      </div>
    </div>
  );
}

function isUserOnboarded(user: User | null): boolean {
  if (!user) return false;

  if (!user.location?.trim() || !user.gender?.trim()) return false;

  const rawContext = user.onboarding_raw_context ?? {};
  if (typeof rawContext.age_range !== "string" || !rawContext.age_range.trim()) {
    return false;
  }

  const hasStyleContext =
    Array.isArray(rawContext.selected_brands) && rawContext.selected_brands.length > 0;
  const hasBodyContext = Boolean(
    rawContext.body_shape && (rawContext.height_cm || rawContext.height_feet)
  );

  return hasStyleContext && hasBodyContext;
}
