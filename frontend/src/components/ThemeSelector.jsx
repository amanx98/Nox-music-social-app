import { useState } from "react";
import { useToast } from "./Toast";

const THEMES = [
  {
    id: "midnight",
    name: "Obsidian Amber",
    desc: "Atmospheric studio dark with warm champagne amber cursor spotlight",
    bg: "#0f1015",
    cardBg: "#171820",
    accent: "#D9A441",
    glow: "rgba(217, 164, 65, 0.20)",
  },
  {
    id: "cyber",
    name: "Cyber Violet",
    desc: "Atmospheric studio dark with electric violet cursor glow",
    bg: "#0f1018",
    cardBg: "#171624",
    accent: "#a855f7",
    glow: "rgba(168, 85, 247, 0.20)",
  },
  {
    id: "emerald",
    name: "Emerald Mist",
    desc: "Atmospheric studio dark with fresh botanical emerald tint",
    bg: "#0d1210",
    cardBg: "#141c18",
    accent: "#10b981",
    glow: "rgba(16, 185, 129, 0.20)",
  },
  {
    id: "crimson",
    name: "Velvet Rose",
    desc: "Atmospheric studio dark with ruby velvet accent glow",
    bg: "#130f11",
    cardBg: "#1f1519",
    accent: "#f43f5e",
    glow: "rgba(244, 63, 94, 0.20)",
  },
  {
    id: "chrome",
    name: "Monochrome Silver",
    desc: "Atmospheric studio dark with crisp metallic silver highlights",
    bg: "#101114",
    cardBg: "#18191e",
    accent: "#e2e8f0",
    glow: "rgba(226, 232, 240, 0.18)",
  },
];

export default function ThemeSelector() {
  const { addToast } = useToast();
  const [currentTheme, setCurrentTheme] = useState(() => {
    const saved = localStorage.getItem("nox_theme");
    if (saved === "cobalt") {
      localStorage.setItem("nox_theme", "midnight");
      return "midnight";
    }
    return saved || "midnight";
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
                      border: "1px solid rgba(255,255,255,0.3)",
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
                      fontWeight: 800,
                      background: "#ffffff",
                      color: "#000000",
                      padding: "2px 8px",
                      borderRadius: "9999px",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    ACTIVE
                  </span>
                )}
              </div>

              <div>
                <div style={{ fontWeight: 700, fontSize: "15px", color: "#fafafa" }}>
                  {t.name}
                </div>
                <div style={{ fontSize: "12px", marginTop: "4px", lineHeight: "1.4", color: "#dadade" }}>
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
