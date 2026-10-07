import { useState, useRef } from "react";
import { Outlet } from "react-router-dom";
import Header from "./components/nav/Header";
import CircleNowPlaying from "./components/nav/CircleNowPlaying";
import MobileDrawer from "./components/nav/MobileDrawer";
import ComposerModal from "./components/composer/ComposerModal";

export default function Layout({ user, onLogout }) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const drawerTriggerRef = useRef(null);

  return (
    <div className="min-h-screen flex flex-col bg-surface text-text">
      <a href="#main-content" className="skip-link">Skip to content</a>

      {/* 1. Sticky Top Navigation */}
      <Header
        user={user}
        onLogout={onLogout}
        onOpenDrawer={() => setIsDrawerOpen((prev) => !prev)}
        isDrawerOpen={isDrawerOpen}
        onOpenComposer={() => setIsComposerOpen(true)}
        drawerTriggerRef={drawerTriggerRef}
      />

      {/* 2. What your circle is listening to (slow, one at a time) */}
      <CircleNowPlaying user={user} />

      {/* Accessible Mobile Navigation Drawer */}
      <MobileDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        user={user}
        onLogout={onLogout}
        triggerRef={drawerTriggerRef}
      />

      {/* Main content with skip-link anchor */}
      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 w-full max-w-[1200px] mx-auto px-4 py-8 outline-none"
      >
        <Outlet context={{ user, onLogout, onOpenComposer: () => setIsComposerOpen(true) }} />
      </main>

      {/* Global Compose Modal */}
      <ComposerModal
        isOpen={isComposerOpen}
        onClose={() => setIsComposerOpen(false)}
        user={user}
        onSuccess={() => {
          // Triggers re-render or notification
        }}
      />
    </div>
  );
}