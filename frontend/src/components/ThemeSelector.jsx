import { useState } from "react";
import { useToast } from "./Toast";

export const THEMES = [
  {
    id: "midnight",
    name: "Obsidian Amber",
    desc: "Deep obsidian black with subtle champagne amber cursor glow",
    bg: "#060607",
    cardBg: "#111114",
    accent: "#D9A441",
    glow: "rgba(217, 164, 65, 0.18)",
  },
  {
    id: "cyber",
    name: "Cyber Violet",
    desc: "Pitch void with translucent electric violet cursor mist",
    bg: "#050508",
    cardBg: "#0f0f17",
    accent: "#a855f7",
    glow: "rgba(168, 85, 247, 0.18)",
  },
  {
    id: "emerald",
    name: "Emerald Mist",
    desc: "Obsidian black with delicate botanical emerald cursor tint",
    bg: "#040605",
    cardBg: "#0c140f",
    accent: "#10b981",
    glow: "rgba(16, 185, 129, 0.18)",
  },
  {
    id: "crimson",
    name: "Velvet Rose",
    desc: "Deep noir with faint ruby velvet cursor shade",
    bg: "#070405",
    cardBg: "#140d10",
    accent: "#f43f5e",
    glow: "rgba(244, 63, 94, 0.18)",
  },
  {
    id: "chrome",
    name: "Monochrome Silver",
    desc: "Deep obsidian noir with understated metallic silver highlights",
    bg: "#060607",
    cardBg: "#101012",
    accent: "#e2e8f0",
    glow: "rgba(226, 232, 240, 0.14)",
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
