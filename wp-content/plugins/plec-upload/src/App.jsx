import React, { useState } from "react";

const createRow = (id) => ({
  id,
  file: null,
  iterationName: "",
});

const ITERATION_REGEX = /^[a-zA-Z0-9_-]+$/;
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_FILE_SIZE_LABEL = "5 MB";

export default function App() {
  const [rows, setRows] = useState([createRow(1)]);
  const [nextId, setNextId] = useState(2);
  const [isUploading, setIsUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [guidelinesOpen, setGuidelinesOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [isBulkDragging, setIsBulkDragging] = useState(false);

  const setRowFile = (rowId, file) => {
    if (file && !file.name.toLowerCase().match(/\.html?$/)) {
      setStatusMessage("Only HTML files are allowed.");
      return;
    }
    if (file && file.size > MAX_FILE_SIZE_BYTES) {
      setStatusMessage(`File "${file.name}" exceeds the ${MAX_FILE_SIZE_LABEL} limit.`);
      return;
    }

    setRows((cur) =>
      cur.map((r) => {
        if (r.id !== rowId) return r;
        const name = file ? file.name.replace(/\.html?$/i, "").replace(/[^a-zA-Z0-9_-]/g, "_") : "";
        return {
          ...r,
          file,
          iterationName: r.iterationName || name,
        };
      })
    );
  };

  const setIterationName = (rowId, value) => {
    const sanitized = value.replace(/[^a-zA-Z0-9_-]/g, "");
    setRows((cur) =>
      cur.map((r) => (r.id === rowId ? { ...r, iterationName: sanitized } : r))
    );
  };

  const addRow = () => {
    setRows((cur) => [...cur, createRow(nextId)]);
    setNextId((n) => n + 1);
  };

  const removeRow = (rowId) => {
    setRows((cur) => (cur.length === 1 ? cur : cur.filter((r) => r.id !== rowId)));
  };

  const applyBulkFiles = (fileList) => {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;

    let skipped = 0;
    let oversized = 0;
    const validFiles = [];

    files.forEach((f) => {
      if (!f.name.toLowerCase().match(/\.html?$/)) { skipped++; return; }
      if (f.size > MAX_FILE_SIZE_BYTES) { oversized++; return; }
      validFiles.push(f);
    });

    if (validFiles.length === 0) {
      const reason = oversized > 0
        ? `${oversized} file(s) exceeded the ${MAX_FILE_SIZE_LABEL} limit.`
        : "Only HTML files are allowed.";
      setStatusMessage(`No files were added. ${reason}`);
      return;
    }

    setRows((cur) => {
      // Fill empty existing rows first, then add new ones
      const updated = [...cur];
      let fileIdx = 0;
      let maxId = cur.reduce((max, r) => Math.max(max, r.id), 0);

      // Fill empty rows
      for (let i = 0; i < updated.length && fileIdx < validFiles.length; i++) {
        if (!updated[i].file) {
          const f = validFiles[fileIdx++];
          const name = f.name.replace(/\.html?$/i, "").replace(/[^a-zA-Z0-9_-]/g, "_");
          updated[i] = { ...updated[i], file: f, iterationName: updated[i].iterationName || name };
        }
      }

      // Add new rows for remaining files
      while (fileIdx < validFiles.length) {
        const f = validFiles[fileIdx++];
        const name = f.name.replace(/\.html?$/i, "").replace(/[^a-zA-Z0-9_-]/g, "_");
        maxId++;
        updated.push({ id: maxId, file: f, iterationName: name });
      }

      setNextId(maxId + 1);
      return updated;
    });

    let msg = `Added ${validFiles.length} file(s).`;
    if (skipped > 0) msg += ` ${skipped} skipped (not HTML).`;
    if (oversized > 0) msg += ` ${oversized} skipped (over ${MAX_FILE_SIZE_LABEL}).`;
    setStatusMessage(msg);
  };

  const handleUpload = async () => {
    if (isUploading) return;

    const config = window.plecUploadConfig || {};
    if (!config.ajaxUrl || !config.nonce) {
      setStatusMessage("Missing config. Reload the page.");
      return;
    }

    const validRows = rows.filter((r) => r.file);
    if (validRows.length === 0) {
      setStatusMessage("Add at least one HTML file before uploading.");
      return;
    }

    const missingName = validRows.find((r) => !r.iterationName.trim());
    if (missingName) {
      setStatusMessage("Iteration name is required for every row.");
      return;
    }

    const invalidName = validRows.find((r) => !ITERATION_REGEX.test(r.iterationName.trim()));
    if (invalidName) {
      setStatusMessage("Iteration names can only contain letters, numbers, hyphens, and underscores.");
      return;
    }

    const oversizedRow = validRows.find((r) => r.file && r.file.size > MAX_FILE_SIZE_BYTES);
    if (oversizedRow) {
      setStatusMessage(`File "${oversizedRow.file.name}" exceeds the ${MAX_FILE_SIZE_LABEL} limit.`);
      return;
    }

    const formData = new FormData();
    formData.append("action", "plec_upload_files");
    formData.append("nonce", config.nonce);

    const payload = validRows.map((r) => ({
      field: `file_${r.id}`,
      iterationName: r.iterationName.trim(),
    }));
    formData.append("rows", JSON.stringify(payload));

    validRows.forEach((r) => {
      formData.append(`file_${r.id}`, r.file);
    });

    try {
      setIsUploading(true);
      setStatusMessage("Uploading...");

      const res = await fetch(config.ajaxUrl, {
        method: "POST",
        body: formData,
        credentials: "same-origin",
      });

      const raw = await res.text();
      let data;
      try {
        data = JSON.parse(raw);
      } catch {
        throw new Error("Server returned an invalid response.");
      }

      if (!res.ok || !data?.success) {
        throw new Error(data?.data?.message || "Upload failed.");
      }

      setStatusMessage(data.data.message || `Successfully uploaded ${data.data.count} file(s).`);

      // Build preview URL
      const siteUrl = config.siteUrl || window.location.origin;
      const files = data.data.files || [];
      if (files.length > 0) {
        const params = new URLSearchParams();
        params.set("theme", "calcite");
        files.forEach((f, i) => {
          const num = i + 1;
          const iterName = validRows[i]?.iterationName?.trim() || f.saved.replace(/\.html?$/i, "");
          params.set(`n${num}`, iterName);
          params.set(`m${num}`, f.saved);
        });
        setPreviewUrl(`${siteUrl}/preview?${params.toString()}`);
      }

      setRows([createRow(1)]);
      setNextId(2);
    } catch (err) {
      setStatusMessage(err?.message || "Upload failed.");
      setPreviewUrl("");
    } finally {
      setIsUploading(false);
    }
  };

  const filledCount = rows.filter((r) => r.file).length;

  const getStatusStyle = () => {
    const s = statusMessage.toLowerCase();
    if (s.includes("fail") || s.includes("invalid") || s.includes("missing") || s.includes("required") || s.includes("only html") || s.includes("can only contain") || s.includes("exceeds") || s.includes("no files were added"))
      return { background: "var(--pu-red-soft)", color: "var(--pu-red-text)", border: "1px solid var(--pu-red-soft)" };
    if (s.includes("success") || s.includes("uploaded"))
      return { background: "var(--pu-green-soft)", color: "var(--pu-green-text)", border: "1px solid var(--pu-green-soft)" };
    return { background: "var(--pu-amber-soft)", color: "var(--pu-amber-text)", border: "1px solid var(--pu-amber-soft)" };
  };

  const fmt = (b) => {
    if (b < 1024) return `${b} B`;
    if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / 1048576).toFixed(2)} MB`;
  };

  const guidelines = [
    "Iteration name must not contain spaces or special characters",
    "Don't leave the iteration name blank",
    "Click Upload when you're ready to upload files",
    "Wait for the preview link to be generated",
  ];

  return (
    <div style={{
      maxWidth: 1120, margin: "0 auto", padding: "32px 20px 48px",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif",
    }}>
      {/* Uploading overlay */}
      {isUploading && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--pu-overlay)", backdropFilter: "blur(12px)", padding: 16 }}>
          <div style={{ width: "100%", maxWidth: 340, borderRadius: 20, background: "var(--pu-surface)", border: "1px solid var(--pu-border)", padding: "36px 32px", textAlign: "center", boxShadow: "var(--pu-shadow-lg)" }}>
            <div style={{ position: "relative", margin: "0 auto 20px", width: 56, height: 56 }}>
              <div className="animate-ping" style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "var(--pu-accent-soft)" }} />
              <div className="animate-spin" style={{ position: "absolute", inset: 4, borderRadius: "50%", border: "2.5px solid var(--pu-border)", borderTopColor: "var(--pu-accent)" }} />
              <div style={{ position: "absolute", inset: 14, borderRadius: "50%", background: "var(--pu-surface)" }} />
            </div>
            <p style={{ fontSize: 15, fontWeight: 600, color: "var(--pu-text)", margin: 0 }}>Uploading files...</p>
            <p style={{ fontSize: 13, color: "var(--pu-text-muted)", margin: "6px 0 0" }}>Please don&apos;t refresh the page</p>
          </div>
        </div>
      )}

      {/* Page header */}
      <div className="pu-animate" style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--pu-text)", margin: "0 0 3px" }}>File Upload</h1>
        <p style={{ fontSize: 13, color: "var(--pu-text-muted)", margin: 0 }}>Upload HTML files and assign iteration names for preview generation.</p>
      </div>

      {/* Guidelines - collapsible, hidden by default */}
      <div className="pu-card pu-animate" style={{ marginBottom: 14, animationDelay: "60ms", overflow: "hidden" }}>
        <button
          type="button"
          onClick={() => setGuidelinesOpen((v) => !v)}
          style={{
            width: "100%", padding: "10px 16px", display: "flex", alignItems: "center", gap: 8,
            background: "none", border: "none", cursor: "pointer", textAlign: "left",
            borderBottom: guidelinesOpen ? "1px solid var(--pu-border)" : "none",
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="var(--pu-accent)" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--pu-text)", flex: 1 }}>Guidelines</span>
          <svg
            xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24"
            stroke="var(--pu-text-muted)" strokeWidth={2}
            style={{ transition: "transform 0.2s", transform: guidelinesOpen ? "rotate(180deg)" : "rotate(0deg)" }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <div style={{
          maxHeight: guidelinesOpen ? 200 : 0,
          overflow: "hidden",
          transition: "max-height 0.25s ease",
        }}>
          <div style={{ padding: "10px 16px 12px" }}>
            <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
              {guidelines.map((text, i) => (
                <li key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "var(--pu-text-secondary)", lineHeight: 1.4 }}>
                  <span style={{
                    width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                    background: "var(--pu-accent-soft)", color: "var(--pu-accent)",
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    fontSize: 10, fontWeight: 700,
                  }}>
                    {i + 1}
                  </span>
                  <span className="m-0">{text}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>

      {/* Bulk Upload */}
      <div
        className="pu-card pu-animate"
        style={{
          marginBottom: 14, animationDelay: "120ms", overflow: "hidden",
          transition: "all 0.25s",
          boxShadow: isBulkDragging ? "0 0 0 2px var(--pu-accent), var(--pu-shadow)" : undefined,
        }}
        onDragOver={(e) => { e.preventDefault(); setIsBulkDragging(true); }}
        onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setIsBulkDragging(false); }}
        onDrop={(e) => { e.preventDefault(); setIsBulkDragging(false); applyBulkFiles(e.dataTransfer?.files); }}
      >
        <label style={{ display: "flex", cursor: "pointer", alignItems: "center", gap: 12, padding: "10px 16px" }}>
          <div style={{
            width: 32, height: 32, flexShrink: 0, borderRadius: 8,
            background: isBulkDragging ? "var(--pu-accent-soft)" : "var(--pu-surface-alt)",
            color: isBulkDragging ? "var(--pu-accent)" : "var(--pu-text-muted)",
            display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s",
          }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--pu-text)" }}>Bulk Upload</span>
            <span style={{ fontSize: 12, color: "var(--pu-text-muted)", marginLeft: 6 }}>
              Drop files or click &middot; Max {MAX_FILE_SIZE_LABEL} per file
            </span>
          </div>
          <input
            type="file" multiple accept=".html,.htm"
            onChange={(e) => { applyBulkFiles(e.target.files); e.target.value = ""; }}
            style={{ display: "none" }}
          />
        </label>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Rows */}
        {rows.map((row, index) => {
          const has = !!row.file;
          const nameEmpty = has && !row.iterationName.trim();
          const nameInvalid = has && row.iterationName.trim() && !ITERATION_REGEX.test(row.iterationName.trim());

          return (
            <div
              key={`row-${row.id}`}
              className="pu-card pu-animate"
              style={{ overflow: "hidden", animationDelay: `${(index + 2) * 60}ms` }}
            >
              {/* Row header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 16px", borderBottom: "1px solid var(--pu-border)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 10, fontWeight: 700,
                    background: has ? "var(--pu-green-soft)" : "var(--pu-surface-alt)",
                    color: has ? "var(--pu-green)" : "var(--pu-text-muted)",
                    transition: "all 0.3s",
                  }}>
                    {has ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    ) : index + 1}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--pu-text)" }}>Upload {index + 1}</span>
                </div>
                <button
                  type="button" onClick={() => removeRow(row.id)} disabled={rows.length === 1}
                  style={{ width: 22, height: 22, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", border: "none", background: "transparent", color: "var(--pu-text-muted)", cursor: "pointer", opacity: rows.length === 1 ? 0.25 : 1, transition: "all 0.15s" }}
                  onMouseEnter={(e) => { if (rows.length > 1) { e.currentTarget.style.background = "var(--pu-red-soft)"; e.currentTarget.style.color = "var(--pu-red)"; } }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--pu-text-muted)"; }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              {/* Row body */}
              <div style={{ padding: "14px 16px 16px", display: "grid", gridTemplateColumns: "3fr 2fr", gap: 14, alignItems: "start" }}>
                {/* File upload */}
                <div>
                  <div style={{ marginBottom: 5, fontSize: 11, fontWeight: 600, color: "var(--pu-text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>HTML File <span style={{ color: "var(--pu-red)" }}>*</span></div>
                  <label
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "8px 12px", borderRadius: 10, height: 40,
                      background: has ? "var(--pu-green-soft)" : "var(--pu-input-bg)",
                      border: `1.5px solid ${has ? "var(--pu-green)" : "var(--pu-input-border)"}`,
                      cursor: "pointer", transition: "all 0.25s",
                    }}
                  >
                    <input type="file" accept=".html,.htm" style={{ display: "none" }}
                      onChange={(e) => { setRowFile(row.id, e.target.files?.[0] ?? null); e.target.value = ""; }}
                    />
                    <div style={{
                      width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                      background: has ? "var(--pu-green-soft)" : "var(--pu-surface)",
                      color: has ? "var(--pu-green)" : "var(--pu-text-muted)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {has ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 16v-8m0 0l-3 3m3-3l3 3M6.75 19.25h10.5A2.25 2.25 0 0019.5 17V7a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 7v10a2.25 2.25 0 002.25 2.25z" /></svg>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
                      {has ? (
                        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--pu-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {row.file.name}
                          <span style={{ fontWeight: 400, color: "var(--pu-text-muted)", marginLeft: 6, fontSize: 11 }}>{fmt(row.file.size)}</span>
                        </div>
                      ) : (
                        <div style={{ fontSize: 13, color: "var(--pu-text-muted)" }}>Choose HTML file</div>
                      )}
                    </div>
                    {has && (
                      <div
                        role="button" tabIndex={0}
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setRowFile(row.id, null); setRows((c) => c.map((r) => r.id === row.id ? { ...r, iterationName: "" } : r)); }}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); setRowFile(row.id, null); } }}
                        style={{ width: 18, height: 18, borderRadius: 4, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--pu-text-muted)", cursor: "pointer" }}
                        title="Remove file"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                      </div>
                    )}
                  </label>
                </div>

                {/* Iteration name */}
                <div>
                  <div style={{ marginBottom: 5, fontSize: 11, fontWeight: 600, color: "var(--pu-text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Iteration Name <span style={{ color: "var(--pu-red)" }}>*</span></div>
                  <input
                    type="text"
                    className={`pu-input${nameEmpty || nameInvalid ? " pu-input--error" : ""}`}
                    placeholder="Required"
                    value={row.iterationName}
                    onChange={(e) => setIterationName(row.id, e.target.value)}
                    style={{ height: 40 }}
                  />
                  {nameEmpty && (
                    <div style={{ fontSize: 11, color: "var(--pu-red-text)", marginTop: 3, paddingLeft: 2 }}>Iteration name is required</div>
                  )}
                  {nameInvalid && (
                    <div style={{ fontSize: 11, color: "var(--pu-red-text)", marginTop: 3, paddingLeft: 2 }}>Only letters, numbers, hyphens, underscores</div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Actions */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, paddingTop: 4 }}>
          <button type="button" onClick={addRow}
            style={{
              display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 18px", borderRadius: 10,
              border: "1.5px solid var(--pu-border)", background: "var(--pu-surface)", color: "var(--pu-text-secondary)",
              fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.2s", boxShadow: "var(--pu-shadow)",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--pu-accent)"; e.currentTarget.style.color = "var(--pu-accent-text)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--pu-border)"; e.currentTarget.style.color = "var(--pu-text-secondary)"; }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            Add Upload
          </button>
          <button type="button" onClick={handleUpload} disabled={isUploading}
            style={{
              display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 24px", borderRadius: 10,
              border: "none", background: "var(--pu-accent)", color: "#fff", fontSize: 13, fontWeight: 600,
              cursor: isUploading ? "not-allowed" : "pointer", opacity: isUploading ? 0.5 : 1,
              transition: "all 0.25s", boxShadow: "0 2px 10px var(--pu-accent-glow)",
            }}
            onMouseEnter={(e) => { if (!isUploading) e.currentTarget.style.background = "#e86a30"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "var(--pu-accent)"; }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
            {isUploading ? "Uploading..." : `Upload${filledCount > 0 ? ` (${filledCount})` : ""}`}
          </button>
        </div>

        {/* Status */}
        {statusMessage && (
          <div className="pu-animate" style={{ borderRadius: 10, padding: "11px 16px", fontSize: 13, fontWeight: 500, ...getStatusStyle() }}>
            <p style={{ margin: 0 }}>{statusMessage}</p>
          </div>
        )}

        {/* Preview URL */}
        {previewUrl && (
          <div className="pu-card pu-animate" style={{ overflow: "hidden" }}>
            <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--pu-border)", display: "flex", alignItems: "center", gap: 8 }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="var(--pu-accent)" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--pu-text)" }}>Preview URL</span>
              <button
                type="button"
                onClick={() => { navigator.clipboard.writeText(previewUrl); }}
                style={{
                  marginLeft: "auto", padding: "4px 10px", borderRadius: 6,
                  border: "1px solid var(--pu-border)", background: "var(--pu-surface-alt)",
                  fontSize: 11, fontWeight: 600, color: "var(--pu-text-muted)", cursor: "pointer",
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--pu-accent)"; e.currentTarget.style.color = "var(--pu-accent)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--pu-border)"; e.currentTarget.style.color = "var(--pu-text-muted)"; }}
              >
                Copy
              </button>
            </div>
            <div style={{ padding: "10px 16px" }}>
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "block", fontSize: 12, fontFamily: "monospace",
                  color: "var(--pu-accent)", wordBreak: "break-all", lineHeight: 1.5,
                  textDecoration: "none",
                }}
              >
                {previewUrl}
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
