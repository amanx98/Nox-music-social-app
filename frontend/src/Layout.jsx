import { useState, useRef } from "react";
import { Outlet } from "react-router-dom";
import Header from "./components/nav/Header";
import MobileDrawer from "./components/nav/MobileDrawer";

export default function Layout({ user, onLogout }) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const drawerTriggerRef = useRef(null);

  return (
    <div className="min-h-screen flex flex-col bg-surface text-text">
      {/* Sticky Header with Navigation and Profile controls */}
      <Header
        user={user}
        onLogout={onLogout}
        onOpenDrawer={() => setIsDrawerOpen((prev) => !prev)}
        isDrawerOpen={isDrawerOpen}
      />

      {/* Accessible Mobile Navigation Drawer */}
      <MobileDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        user={user}
        onLogout={onLogout}
        triggerRef={drawerTriggerRef}
      />

      {/* Main Content View with Skip-Link Anchor */}
      <main id="main-content" className="flex-1 w-full max-w-[1240px] mx-auto px-4 py-6 outline-none">
        <Outlet context={{ user, onLogout }} />
      </main>
    </div>
  );
}