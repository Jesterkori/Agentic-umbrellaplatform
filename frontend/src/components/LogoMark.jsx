import React from "react";

export default function LogoMark({ size = 56, compact = false }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: compact ? "10px" : "14px", fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div
        style={{
          width: size,
          height: size,
          minWidth: size,
          minHeight: size,
          borderRadius: "22px",
          background: "linear-gradient(135deg, #7fb5ff 0%, #0b2d67 100%)",
          display: "grid",
          placeItems: "center",
          boxShadow: "0 20px 48px rgba(7, 30, 80, 0.32)",
        }}
      >
        <svg viewBox="0 0 88 88" width="74%" height="74%" aria-hidden="true">
          <defs>
            <linearGradient id="logo-mark-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#bae6fd" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>
          </defs>
          <path
            d="M16 54 C26 34 38 38 50 28 C56 24 64 26 72 40"
            fill="none"
            stroke="url(#logo-mark-grad)"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <circle cx="16" cy="54" r="5.5" fill="#fff" />
          <circle cx="28" cy="30" r="4.5" fill="#facc15" />
          <circle cx="42" cy="42" r="4.5" fill="#22c55e" />
          <circle cx="56" cy="28" r="4.5" fill="#38bdf8" />
          <circle cx="70" cy="42" r="4.5" fill="#111827" />
        </svg>
      </div>

      {!compact && (
        <div style={{ display: "grid", gap: "4px", lineHeight: 1.1 }}>
          <div style={{ fontSize: "1rem", fontWeight: 800, letterSpacing: "0.12em", color: "#f8fbff" }}>
            OMBRELLA
          </div>
          <div style={{ fontSize: "0.74rem", fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: "#90b4ff" }}>
            Embrace the Future
          </div>
        </div>
      )}
    </div>
  );
}
