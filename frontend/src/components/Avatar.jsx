import React, { useState, useEffect } from "react";
import { Disc, Headphones, Mic, Radio, Music, Volume2 } from "lucide-react";
import { resolveImageUrl } from "../api/client";

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
  src,
  avatarUrl,
  customIcon,
  onClick,
  className = "",
}) {
  const [imageError, setImageError] = useState(false);

  // Derive active image source
  const rawSrc = src || avatarUrl || (typeof window !== "undefined" ? localStorage.getItem(`nox_avatar_img_${username}`) : null);
  const resolvedSrc = rawSrc ? resolveImageUrl(rawSrc) : null;

  // Reset error state if image source changes
  useEffect(() => {
    setImageError(false);
  }, [resolvedSrc]);

  // Derive custom icon or symbol from props or localStorage
  const effectiveIcon = customIcon || (typeof window !== "undefined" ? localStorage.getItem(`nox_avatar_symbol_${username}`) : null);

  const palette = getAvatarForUser(username);
  const initial = (username[0] || "U").toUpperCase();
  const IconComponent = palette.icon;

  const showImage = Boolean(resolvedSrc && !imageError);

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
        overflow: "hidden",
        position: "relative",
      }}
      title={username}
    >
      {showImage ? (
        <img
          src={resolvedSrc}
          alt={username}
          onError={() => setImageError(true)}
          className="w-full h-full object-cover rounded-full pointer-events-none"
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : effectiveIcon ? (
        <span style={{ fontSize: `${Math.round(size * 0.45)}px` }}>{effectiveIcon}</span>
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
