"use client";

import { useState } from "react";
import { DataProvider, useDataContext } from "@/contexts/DataContext";
import Sidebar from "@/components/layout/Sidebar";
import ThreadView from "@/components/thread/ThreadView";
import OnboardingFlow from "@/components/onboarding/OnboardingFlow";
import SavedLooksView from "@/components/outfits/SavedLooksView";
import ShoppingListView from "@/components/products/ShoppingListView";
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
  const { activeView, selectedUserId, selectedUser, refreshSelectedUser } =
    useDataContext();
  const onboardingComplete = isUserOnboarded(selectedUser);

  async function handleOnboardingComplete() {
    if (!selectedUserId) return;
    await refreshSelectedUser();
  }

  if (!selectedUserId) {
    return <LoadingScreen />;
  }

  if (!selectedUser) {
    return <LoadingScreen />;
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
