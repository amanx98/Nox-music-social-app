import React from "react";
import { Disc, Headphones, Mic, Radio, Music, Volume2 } from "lucide-react";

// Curated avatar palettes with perceptual dark tones and subtle colored borders
const AVATAR_PALETTES = [
  { bg: "#1f1a14", border: "#d9a441", text: "#f4efe2", icon: Disc },
  { bg: "#141f1f", border: "#2f6f6e", text: "#e2f4f3", icon: Radio },
  { bg: "#241613", border: "#e06d53", text: "#fdeee9", icon: Headphones },
  { bg: "#171a24", border: "#4180d9", text: "#eaf1fd", icon: Mic },
  { bg: "#1f141f", border: "#d94194", text: "#fdeaf3", icon: Music },
  { bg: "#161f14", border: "#58a339", text: "#edfbe7", icon: Volume2 },
];

export function getAvatarForUser(username = "") {
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_PALETTES.length;
  return AVATAR_PALETTES[index];
}

export default function Avatar({
  username = "user",
  size = 36,
  customIcon,
  onClick,
  className = "",
}) {
  const palette = getAvatarForUser(username);
  const initial = (username[0] || "U").toUpperCase();
  const IconComponent = palette.icon;

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
        background: palette.bg,
        border: `1.5px solid ${palette.border}`,
        color: palette.text,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: onClick ? "pointer" : "default",
        userSelect: "none",
        flexShrink: 0,
      }}
      title={username}
    >
      {customIcon ? (
        <span style={{ fontSize: `${Math.round(size * 0.45)}px` }}>{customIcon}</span>
      ) : size >= 38 ? (
        <span
          className="font-heading font-bold"
          style={{ fontSize: `${Math.round(size * 0.42)}px`, lineHeight: 1 }}
        >
          {initial}
        </span>
      ) : (
        <IconComponent
          style={{ width: `${Math.round(size * 0.5)}px`, height: `${Math.round(size * 0.5)}px` }}
          strokeWidth={2}
        />
      )}
    </div>
  );
}
