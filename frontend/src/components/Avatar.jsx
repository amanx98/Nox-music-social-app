import React from "react";

// Curated music avatar icons & colorways
const AVATAR_STYLES = [
  { icon: "💽", bg: "linear-gradient(135deg, #2d261e, #1a1713)", border: "#D9A441" },
  { icon: "📻", bg: "linear-gradient(135deg, #1d2c2b, #131d1d)", border: "#2F6F6E" },
  { icon: "🎧", bg: "linear-gradient(135deg, #38241e, #1f1411)", border: "#E06D53" },
  { icon: "🎹", bg: "linear-gradient(135deg, #252422, #181716)", border: "#b8af9c" },
  { icon: "🎸", bg: "linear-gradient(135deg, #2e1e2d, #1a111a)", border: "#d94194" },
  { icon: "🎙️", bg: "linear-gradient(135deg, #1e2838, #111720)", border: "#4180d9" },
  { icon: "🎷", bg: "linear-gradient(135deg, #332b1a, #1d180f)", border: "#e8b350" },
  { icon: "🔊", bg: "linear-gradient(135deg, #232a1e, #141811)", border: "#6cb341" },
];

export function getAvatarForUser(username = "") {
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_STYLES.length;
  return AVATAR_STYLES[index];
}

export default function Avatar({ username = "user", size = 36, customIcon, onClick, className = "" }) {
  const style = getAvatarForUser(username);
  const icon = customIcon || style.icon;

  return (
    <div
      onClick={onClick}
      className={className}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        minWidth: `${size}px`,
        minHeight: `${size}px`,
        borderRadius: "50%",
        background: style.bg,
        border: `1.5px solid ${style.border}`,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: `${Math.round(size * 0.48)}px`,
        cursor: onClick ? "pointer" : "default",
        userSelect: "none",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
      }}
      title={`@${username}`}
    >
      {icon}
    </div>
  );
}
