import React, { useState } from "react";

const limits = [
  { network: "AppLovin", limit: "3.4 MB", type: "Combined" },
  { network: "Facebook", limit: "1.4 MB", type: "Individual" },
  { network: "Google", limit: "1.0 MB", type: "Individual" },
  { network: "Unity", limit: "3.4 MB", type: "Combined" },
  { network: "Vungle", limit: "3.4 MB", type: "Combined" },
  { network: "Mintegral", limit: "3.4 MB", type: "Combined" },
  { network: "IronSource", limit: "3.4 MB", type: "Combined" },
];

export default function Instructions() {
  const [open, setOpen] = useState(false);

  return (
    <div className="plec-card" style={{ overflow: "hidden" }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          display: "flex", width: "100%", alignItems: "center", justifyContent: "space-between",
          padding: "14px 20px", cursor: "pointer", border: "none", background: "transparent",
          color: "var(--plec-text)", textAlign: "left",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: "var(--plec-accent-soft)", color: "var(--plec-accent-text)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Guidelines & Limits</div>
            <div style={{ fontSize: 11, color: "var(--plec-text-muted)", marginTop: 1 }}>Formats, dimensions, network size caps</div>
          </div>
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="var(--plec-text-muted)" strokeWidth={2}
          style={{ transition: "transform 0.25s", transform: open ? "rotate(180deg)" : "rotate(0)" }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="animate-fade-in-up" style={{ borderTop: "1px solid var(--plec-border)", padding: "16px 20px 20px" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
            <span className="plec-badge" style={{ background: "var(--plec-green-soft)", color: "var(--plec-green-text)" }}>MP4</span>
            <span className="plec-badge" style={{ background: "var(--plec-green-soft)", color: "var(--plec-green-text)" }}>GIF</span>
            <span className="plec-badge" style={{ background: "var(--plec-accent-soft)", color: "var(--plec-accent-text)" }}>854x1138 portrait</span>
            <span className="plec-badge" style={{ background: "var(--plec-accent-soft)", color: "var(--plec-accent-text)" }}>1138x854 landscape</span>
          </div>
          <div style={{ display: "grid", gap: 6, gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
            {limits.map(({ network, limit, type }) => (
              <div key={network} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                borderRadius: 12, background: "var(--plec-surface-alt)", padding: "8px 14px",
              }}>
                <span style={{ fontSize: 12, fontWeight: 500, color: "var(--plec-text-secondary)" }}>{network}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--plec-text)" }}>{limit}</span>
                  <span className="plec-badge" style={{
                    fontSize: 9, padding: "1px 6px",
                    background: type === "Individual" ? "var(--plec-amber-soft)" : "transparent",
                    color: type === "Individual" ? "var(--plec-amber-text)" : "var(--plec-text-muted)",
                  }}>{type}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
