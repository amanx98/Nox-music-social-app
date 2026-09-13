import { useState } from "react";
import { useToast } from "./Toast";

export const THEMES = [
  {
    id: "midnight",
    name: "Midnight Obsidian",
    desc: "Ultra-deep blacks with warm amber gold accents",
    bg: "#090807",
    cardBg: "#181512",
    accent: "#D9A441",
    glow: "rgba(217, 164, 65, 0.4)",
  },
  {
    id: "cyber",
    name: "Cyber Sonic",
    desc: "Pitch black with electric violet & cyber cyan",
    bg: "#06050a",
    cardBg: "#151121",
    accent: "#a855f7",
    glow: "rgba(168, 85, 247, 0.5)",
  },
  {
    id: "emerald",
    name: "Emerald Analog",
    desc: "Dark forest slate with glowing mint emerald",
    bg: "#040806",
    cardBg: "#0f1c16",
    accent: "#10b981",
    glow: "rgba(16, 185, 129, 0.5)",
  },
  {
    id: "crimson",
    name: "Crimson Velvet",
    desc: "Velvet noir with glowing ruby rose & crimson",
    bg: "#080406",
    cardBg: "#1a0d14",
    accent: "#f43f5e",
    glow: "rgba(244, 63, 94, 0.5)",
  },
  {
    id: "solar",
    name: "Solar Sunset",
    desc: "Espresso noir with hot sunset orange & gold",
    bg: "#090604",
    cardBg: "#1c130d",
    accent: "#f97316",
    glow: "rgba(249, 115, 22, 0.5)",
  },
];

export default function ThemeSelector() {
  const { addToast } = useToast();
  const [currentTheme, setCurrentTheme] = useState(() => {
    return localStorage.getItem("nox_theme") || "midnight";
  });

  function handleSelectTheme(themeId) {
    setCurrentTheme(themeId);
    document.documentElement.setAttribute("data-theme", themeId);
    localStorage.setItem("nox_theme", themeId);
    const themeObj = THEMES.find((t) => t.id === themeId);
    addToast(`Theme switched to ${themeObj?.name || themeId}!`);
  }

  return (
    <div style={{ marginTop: "12px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "14px" }}>
        {THEMES.map((t) => {
          const isActive = currentTheme === t.id;

          return (
            <div
              key={t.id}
              onClick={() => handleSelectTheme(t.id)}
              style={{
                background: t.cardBg,
                border: isActive ? `2px solid ${t.accent}` : "1px solid var(--border)",
                borderRadius: "var(--radius)",
                padding: "16px",
                cursor: "pointer",
                transition: "all 0.2s ease",
                boxShadow: isActive ? `0 0 16px ${t.glow}` : "none",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              {/* Color Swatch Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                  <div
                    style={{
                      width: "18px",
                      height: "18px",
                      borderRadius: "50%",
                      background: t.bg,
                      border: "1px solid rgba(255,255,255,0.2)",
                    }}
                    title="Deep Black Background"
                  />
                  <div
                    style={{
                      width: "18px",
                      height: "18px",
                      borderRadius: "50%",
                      background: t.accent,
                      boxShadow: `0 0 8px ${t.glow}`,
                    }}
                    title="Accent Color"
                  />
                </div>

                {isActive && (
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      color: t.accent,
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    ✓ ACTIVE
                  </span>
                )}
              </div>

              <div>
                <div style={{ fontWeight: 700, fontSize: "15px", color: "var(--cream-text)" }}>
                  {t.name}
                </div>
                <div className="meta" style={{ fontSize: "11.5px", marginTop: "3px", lineHeight: "1.4" }}>
                  {t.desc}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
