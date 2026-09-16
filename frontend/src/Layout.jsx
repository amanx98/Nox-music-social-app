import { useState, useRef } from "react";
import { Outlet } from "react-router-dom";
import Header from "./components/nav/Header";
import BroadcastTicker from "./components/nav/BroadcastTicker";
import MobileDrawer from "./components/nav/MobileDrawer";
import ComposerModal from "./components/composer/ComposerModal";

export default function Layout({ user, onLogout }) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const drawerTriggerRef = useRef(null);

  return (
    <div className="min-h-screen flex flex-col bg-surface text-text radio-desk-grid">
      {/* 1. Sticky Top Navigation */}
      <Header
        user={user}
        onLogout={onLogout}
        onOpenDrawer={() => setIsDrawerOpen((prev) => !prev)}
        isDrawerOpen={isDrawerOpen}
        onOpenComposer={() => setIsComposerOpen(true)}
      />

      {/* 2. Live Broadcast Community Ticker directly beneath header */}
      <BroadcastTicker />

      {/* Accessible Mobile Navigation Drawer */}
      <MobileDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        user={user}
        onLogout={onLogout}
        triggerRef={drawerTriggerRef}
      />

      {/* Main Editorial Content View with Skip-Link Anchor */}
      <main
        id="main-content"
        className="flex-1 w-full max-w-[1440px] mx-auto px-4 py-6 outline-none"
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