import React, { useState } from "react";
import { X } from "lucide-react";
import Login from "../../Login";
import Register from "../../Register";

export default function AuthModal({ isOpen, onClose, onLoginSuccess }) {
  const [showRegister, setShowRegister] = useState(false);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[440px] bg-surface-raised border border-border rounded-xl shadow-2xl p-6 overflow-y-auto max-h-[90vh] text-left"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute top-4 right-4 p-1.5 rounded-md text-text-muted hover:text-text hover:bg-surface-hover transition-colors cursor-pointer z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="pt-2">
          {showRegister ? (
            <Register
              onRegisterSuccess={() => setShowRegister(false)}
              onSwitchToLogin={() => setShowRegister(false)}
              onLoginSuccess={(u) => {
                onLoginSuccess(u);
                onClose();
              }}
            />
          ) : (
            <Login
              onLoginSuccess={(u) => {
                onLoginSuccess(u);
                onClose();
              }}
              onSwitchToRegister={() => setShowRegister(true)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
