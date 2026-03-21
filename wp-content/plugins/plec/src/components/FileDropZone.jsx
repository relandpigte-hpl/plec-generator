import React, { useState } from "react";

export default function FileDropZone({ value, onChange, inputId, label }) {
  const [isDragging, setIsDragging] = useState(false);

  const onDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = () => setIsDragging(false);
  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) onChange(file);
  };
  const onInputChange = (e) => onChange(e.target.files?.[0] ?? null);

  const fmt = (b) => {
    if (b < 1024) return `${b} B`;
    if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / 1048576).toFixed(2)} MB`;
  };

  const has = !!value;

  return (
    <label
      htmlFor={inputId}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "14px 16px",
        borderRadius: 16,
        background: isDragging ? "var(--plec-accent-soft)" : has ? "var(--plec-green-soft)" : "var(--plec-surface-alt)",
        border: `1.5px solid ${isDragging ? "var(--plec-accent)" : has ? "var(--plec-green)" : "transparent"}`,
        cursor: "pointer",
        transition: "all 0.25s cubic-bezier(0.16,1,0.3,1)",
        transform: isDragging ? "scale(1.01)" : "scale(1)",
        width: "100%",
        minHeight: 56,
      }}
    >
      <input id={inputId} style={{ display: "none" }} type="file" accept=".mp4,.gif,video/mp4,image/gif" onChange={onInputChange} />

      <div style={{
        width: 36, height: 36, borderRadius: 12, flexShrink: 0,
        background: has ? "var(--plec-green-soft)" : isDragging ? "var(--plec-accent-soft)" : "var(--plec-surface)",
        color: has ? "var(--plec-green)" : isDragging ? "var(--plec-accent)" : "var(--plec-text-muted)",
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "all 0.2s",
      }}>
        {has ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 16v-8m0 0l-3 3m3-3l3 3M6.75 19.25h10.5A2.25 2.25 0 0019.5 17V7a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 7v10a2.25 2.25 0 002.25 2.25z" />
          </svg>
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {has ? (
          <>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--plec-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {value.name}
            </div>
            <div style={{ fontSize: 11, color: "var(--plec-text-muted)", marginTop: 1 }}>{fmt(value.size)}</div>
          </>
        ) : (
          <div style={{ fontSize: 13, color: "var(--plec-text-muted)" }}>{label}</div>
        )}
      </div>

      {has && (
        <div
          role="button"
          tabIndex={0}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onChange(null); }}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onChange(null); } }}
          style={{
            width: 24, height: 24, borderRadius: 8, flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--plec-text-muted)", cursor: "pointer",
            transition: "color 0.15s",
          }}
          title="Remove file"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
      )}
    </label>
  );
}
