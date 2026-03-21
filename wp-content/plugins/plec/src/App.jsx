import React, { useState } from "react";
import FileDropZone from "./components/FileDropZone";
import Instructions from "./components/Instructions";

const createRow = (id) => ({
  id,
  adNetworks: ["AppLovin"],
  filename: "",
  iterationName: "",
  files: {
    portrait: null,
    landscape: null,
  },
});

const parseNamingFromAssetFilename = (fileName) => {
  const nameWithoutExtension = fileName.replace(/\.[^/.]+$/, "");
  const hasSipIteration = /(?:^|_)sip_\d{8}_\d{2}(?:_|$)/i.test(
    nameWithoutExtension
  );

  if (!hasSipIteration) {
    return null;
  }

  const filenameValue = nameWithoutExtension.replace(
    /_(portrait|landscape)$/i,
    ""
  );
  const iterationMatch = filenameValue.match(/(sip_\d{8}_\d{2})/i);

  return {
    filename: filenameValue,
    iterationName: iterationMatch ? filenameValue : null,
  };
};

const parseRowNumberFromAssetFilename = (fileName) => {
  const match = fileName.match(/_(\d{2})_/);
  if (!match) {
    return null;
  }

  const rowNumber = Number.parseInt(match[1], 10);
  return Number.isFinite(rowNumber) && rowNumber > 0 ? rowNumber : null;
};

const parseAssetTypeFromAssetFilename = (fileName) => {
  const match = fileName.match(/(?:^|_)(portrait|landscape)(?:\.[^/.]+)?$/i);
  return match ? match[1].toLowerCase() : null;
};

const areFilesSame = (fileA, fileB) => {
  if (!fileA || !fileB) {
    return false;
  }

  return (
    fileA.name === fileB.name &&
    fileA.size === fileB.size &&
    fileA.lastModified === fileB.lastModified &&
    fileA.type === fileB.type
  );
};

const hasAnyRowFile = (row) => !!row?.files?.portrait || !!row?.files?.landscape;
const MAX_FILE_UPLOADS = 20;
const ALLOWED_UPLOAD_EXTENSIONS = [".mp4", ".gif"];
const MAX_COMBINED_UPLOAD_FILE_SIZE_BYTES = 3565158;
const MAX_COMBINED_UPLOAD_FILE_SIZE_LABEL = "3.4 MB";

const getMaxCombinedUploadFileSizeBytes = () => {
  const configuredLimit = Number.parseInt(
    globalThis?.plecAppConfig?.maxCombinedFileSizeBytes,
    10
  );
  return Number.isFinite(configuredLimit) && configuredLimit > 0
    ? configuredLimit
    : MAX_COMBINED_UPLOAD_FILE_SIZE_BYTES;
};

const isAllowedUploadFile = (file) => {
  if (!file?.name) {
    return false;
  }

  const lowerName = file.name.toLowerCase();
  return ALLOWED_UPLOAD_EXTENSIONS.some((extension) =>
    lowerName.endsWith(extension)
  );
};

export default function App() {
  const defaultAdNetwork = "AppLovin";
  const adNetworkOptions = [
    "AppLovin",
    "Facebook",
    "Google",
    "Unity",
    "Vungle",
    "Mintegral",
    "IronSource",
    "Moloco",
  ];

  const [rows, setRows] = useState([createRow(1)]);
  const [nextRowId, setNextRowId] = useState(2);
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [isBulkDragging, setIsBulkDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");

  const networkColors = {
    AppLovin: { color: "var(--plec-pill-applovin)", bg: "var(--plec-pill-applovin-bg)", border: "var(--plec-pill-applovin-border)" },
    Facebook: { color: "var(--plec-pill-facebook)", bg: "var(--plec-pill-facebook-bg)", border: "var(--plec-pill-facebook-border)" },
    Google: { color: "var(--plec-pill-google)", bg: "var(--plec-pill-google-bg)", border: "var(--plec-pill-google-border)" },
    Unity: { color: "var(--plec-pill-unity)", bg: "var(--plec-pill-unity-bg)", border: "var(--plec-pill-unity-border)" },
    Vungle: { color: "var(--plec-pill-vungle)", bg: "var(--plec-pill-vungle-bg)", border: "var(--plec-pill-vungle-border)" },
    Mintegral: { color: "var(--plec-pill-mintegral)", bg: "var(--plec-pill-mintegral-bg)", border: "var(--plec-pill-mintegral-border)" },
    IronSource: { color: "var(--plec-pill-ironsource)", bg: "var(--plec-pill-ironsource-bg)", border: "var(--plec-pill-ironsource-border)" },
    Moloco: { color: "var(--plec-pill-moloco)", bg: "var(--plec-pill-moloco-bg)", border: "var(--plec-pill-moloco-border)" },
  };

  const withAutoAppendedRow = (updatedRows) => {
    const lastRow = updatedRows[updatedRows.length - 1];
    const isLastRowComplete =
      !!lastRow?.files?.portrait && !!lastRow?.files?.landscape;

    if (!isLastRowComplete) {
      return updatedRows;
    }

    const maxRowId = updatedRows.reduce(
      (maxId, row) => (row.id > maxId ? row.id : maxId),
      0
    );
    const newRowId = maxRowId + 1;
    setNextRowId((current) => (current <= newRowId ? newRowId + 1 : current));

    return [...updatedRows, createRow(newRowId)];
  };

  const setRowFile = (rowId, type, file) => {
    if (file && !isAllowedUploadFile(file)) {
      setStatusMessage("Only MP4 and GIF files are allowed.");
      return;
    }

    setRows((current) => {
      const updatedRows = current.map((row) =>
        row.id === rowId
          ? (() => {
              const nextRow = {
                ...row,
                files: {
                  ...row.files,
                  [type]: file,
                },
              };

              if (!file?.name) {
                return {
                  ...nextRow,
                  iterationName: nextRow.filename,
                };
              }

              const parsedNaming = parseNamingFromAssetFilename(file.name);
              if (!parsedNaming) {
                return {
                  ...nextRow,
                  iterationName: nextRow.filename,
                };
              }

              const nextFilename = nextRow.filename.trim()
                ? nextRow.filename
                : parsedNaming.filename;

              return {
                ...nextRow,
                filename: nextFilename,
                iterationName: nextFilename,
              };
            })()
          : row
      );

      return withAutoAppendedRow(updatedRows);
    });
  };

  const toggleAdNetwork = (rowId, network) => {
    setRows((current) =>
      current.map((row) => {
        if (row.id !== rowId) {
          return row;
        }

        const currentNetworks = Array.isArray(row.adNetworks)
          ? row.adNetworks
          : [defaultAdNetwork];
        const isSelected = currentNetworks.includes(network);
        let nextNetworks = currentNetworks;

        if (isSelected) {
          // Keep at least one network selected per row.
          if (currentNetworks.length > 1) {
            nextNetworks = currentNetworks.filter((name) => name !== network);
          }
        } else {
          nextNetworks = [...currentNetworks, network];
        }

        return {
          ...row,
          adNetworks: adNetworkOptions.filter((name) => nextNetworks.includes(name)),
        };
      })
    );
  };

  const setRowText = (rowId, key, value) => {
    setRows((current) => {
      return current.map((row) => {
        if (row.id !== rowId) {
          return row;
        }

        if (key === "filename" || key === "iterationName") {
          return {
            ...row,
            filename: value,
            iterationName: value,
          };
        }

        return { ...row, [key]: value };
      });
    });
  };

  const addRow = () => {
    const id = nextRowId;
    setRows((current) => [...current, createRow(id)]);
    setNextRowId((current) => current + 1);
  };

  const removeRow = (rowId) => {
    setRows((current) => {
      if (current.length === 1) {
        return current;
      }

      return current.filter((row) => row.id !== rowId);
    });
  };

  const applyBulkUpload = (selectedFiles) => {
    if (!selectedFiles || selectedFiles.length === 0) {
      return;
    }

    const matchedUploads = [];
    let skippedCount = 0;
    let invalidFormatCount = 0;

    selectedFiles.forEach((file) => {
      if (!isAllowedUploadFile(file)) {
        invalidFormatCount += 1;
        return;
      }

      const rowNumber = parseRowNumberFromAssetFilename(file.name);
      const assetType = parseAssetTypeFromAssetFilename(file.name);

      if (!rowNumber || !assetType) {
        skippedCount += 1;
        return;
      }

      matchedUploads.push({ file, rowNumber, assetType });
    });

    if (matchedUploads.length === 0) {
      const reason = invalidFormatCount > 0
        ? "Only MP4 and GIF files are allowed."
        : "Use names that include _NN_ and end with _portrait or _landscape.";
      setStatusMessage(`No files were matched. ${reason}`);
      return;
    }

    const maxRowNumber = matchedUploads.reduce(
      (maxValue, upload) =>
        upload.rowNumber > maxValue ? upload.rowNumber : maxValue,
      1
    );

    const assignedSlots = new Set();
    matchedUploads.forEach(({ rowNumber, assetType }) => {
      assignedSlots.add(`${rowNumber}-${assetType}`);
    });

    setRows((current) => {
      const updatedRows = current.map((row) => ({
        ...row,
        iterationName: row.filename,
        files: { ...row.files },
      }));

      const currentMaxRowId = updatedRows.reduce(
        (maxId, row) => (row.id > maxId ? row.id : maxId),
        0
      );
      let nextId = currentMaxRowId + 1;

      while (updatedRows.length < maxRowNumber) {
        updatedRows.push(createRow(nextId));
        nextId += 1;
      }

      setNextRowId((currentValue) =>
        currentValue < nextId ? nextId : currentValue
      );

      matchedUploads.forEach(({ file, rowNumber, assetType }) => {
        const targetRow = updatedRows[rowNumber - 1];
        if (!targetRow) {
          return;
        }

        targetRow.files[assetType] = file;

        const parsedNaming = parseNamingFromAssetFilename(file.name);
        if (!parsedNaming) {
          return;
        }

        if (!targetRow.filename.trim()) {
          targetRow.filename = parsedNaming.filename;
        }

        targetRow.iterationName = targetRow.filename;
      });

      const compactedRows = updatedRows.filter(hasAnyRowFile);

      return compactedRows.length > 0 ? compactedRows : [createRow(1)];
    });

    const messageSuffix =
      skippedCount > 0
        ? ` ${skippedCount} file(s) were skipped because the name did not match the pattern.`
        : "";
    const invalidFormatSuffix =
      invalidFormatCount > 0
        ? ` ${invalidFormatCount} file(s) were skipped because only MP4 and GIF are allowed.`
        : "";

    setStatusMessage(
      `Assigned ${matchedUploads.length} file(s) to ${assignedSlots.size} slot(s).${messageSuffix}${invalidFormatSuffix}`
    );
  };

  const handleBulkUploadInputChange = (event) => {
    const selectedFiles = Array.from(event.target.files || []);
    event.target.value = "";
    applyBulkUpload(selectedFiles);
  };

  const handleBulkDragOver = (event) => {
    event.preventDefault();
    setIsBulkDragging(true);
  };

  const handleBulkDragLeave = (event) => {
    if (event.currentTarget.contains(event.relatedTarget)) {
      return;
    }

    setIsBulkDragging(false);
  };

  const handleBulkDrop = (event) => {
    event.preventDefault();
    setIsBulkDragging(false);
    const droppedFiles = Array.from(event.dataTransfer?.files || []);
    applyBulkUpload(droppedFiles);
  };

  const handleGenerate = async () => {
    if (isGenerating) {
      return;
    }

    const config = window.plecAppConfig || {};
    if (!config.ajaxUrl || !config.nonce) {
      setStatusMessage("Missing app config. Reload the page and try again.");
      return;
    }

    const rowsForGeneration = rows.filter(
      (row) => !!row.files.portrait || !!row.files.landscape
    );

    if (rowsForGeneration.length === 0) {
      setStatusMessage("Add at least one row with both files before generating.");
      return;
    }

    const maxFileUploads = Number.parseInt(config.maxFileUploads, 10);
    const serverLimit = Number.isFinite(maxFileUploads) && maxFileUploads > 0
      ? maxFileUploads
      : MAX_FILE_UPLOADS;
    const uploadLimit = Math.min(MAX_FILE_UPLOADS, serverLimit);
    const requiredUploads = rowsForGeneration.length * 2;

    if (requiredUploads > uploadLimit) {
      const maxRows = Math.floor(uploadLimit / 2);
      setStatusMessage(
        `Too many files for one request. You selected ${rowsForGeneration.length} rows (${requiredUploads} files), but the limit is ${uploadLimit} files (about ${maxRows} row(s)). Generate in smaller batches.`
      );
      return;
    }

    const invalidRow = rowsForGeneration.find(
      (row) => !row.files.portrait || !row.files.landscape
    );

    if (invalidRow) {
      setStatusMessage("Each row needs both portrait and landscape files.");
      return;
    }

    const hasDuplicateMediaRow = rowsForGeneration.some((row) =>
      areFilesSame(row.files.portrait, row.files.landscape)
    );

    if (hasDuplicateMediaRow) {
      setStatusMessage(
        "Portrait and landscape files cannot be the same in the same row."
      );
      return;
    }

    const oversizedRow = rowsForGeneration.find((row) => {
      const portraitFile = row.files.portrait;
      const landscapeFile = row.files.landscape;
      if (!portraitFile || !landscapeFile) {
        return false;
      }

      const combinedSize = portraitFile.size + landscapeFile.size;
      return (
        portraitFile.size <= 0 ||
        landscapeFile.size <= 0 ||
        combinedSize > getMaxCombinedUploadFileSizeBytes()
      );
    });

    if (oversizedRow) {
      const portraitName = oversizedRow.files.portrait?.name || "portrait file";
      const landscapeName = oversizedRow.files.landscape?.name || "landscape file";
      setStatusMessage(
        `Combined size for "${portraitName}" and "${landscapeName}" exceeds the ${MAX_COMBINED_UPLOAD_FILE_SIZE_LABEL} limit.`
      );
      return;
    }

    const payloadRows = rowsForGeneration.map((row, index) => {
      const baseName = row.filename.trim() || `sip-${index + 1}`;
      const fileName = /\.html?$/i.test(baseName) ? baseName : `${baseName}.html`;

      return {
        id: row.id,
        filename: fileName,
        adNetworks:
          row.adNetworks && row.adNetworks.length > 0
            ? row.adNetworks
            : [defaultAdNetwork],
        adNetwork: row.adNetworks?.[0] || defaultAdNetwork,
        portraitField: `row_${row.id}_portrait`,
        landscapeField: `row_${row.id}_landscape`,
      };
    });

    const formData = new FormData();
    formData.append("action", "plec_generate_zip");
    formData.append("nonce", config.nonce);
    formData.append("rows", JSON.stringify(payloadRows));

    rowsForGeneration.forEach((row) => {
      formData.append(`row_${row.id}_portrait`, row.files.portrait);
      formData.append(`row_${row.id}_landscape`, row.files.landscape);
    });

    try {
      setIsGenerating(true);
      setStatusMessage("Generating files and zip archive...");

      const response = await fetch(config.ajaxUrl, {
        method: "POST",
        body: formData,
        credentials: "same-origin",
      });

      const rawResponseText = await response.text();
      let data = null;

      try {
        data = JSON.parse(rawResponseText);
      } catch {
        const readableServerMessage = rawResponseText
          .replace(/<[^>]*>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 220);
        throw new Error(
          readableServerMessage
            ? `Server returned non-JSON response: ${readableServerMessage}`
            : "Server returned non-JSON response."
        );
      }

      if (!response.ok || !data?.success) {
        const message =
          data?.data?.message || "Generation failed. Please try again.";
        throw new Error(message);
      }

      const downloadUrl = data?.data?.downloadUrl;
      if (!downloadUrl) {
        throw new Error("Zip was created but no download URL was returned.");
      }

      const downloadAnchor = document.createElement("a");
      downloadAnchor.href = downloadUrl;
      downloadAnchor.download = "";
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      document.body.removeChild(downloadAnchor);

      setStatusMessage(
        `Generated ${data?.data?.fileCount ?? rowsForGeneration.length} file(s). Download started.`
      );

      // Build preview URL using server-returned file paths
      const siteUrl = config.siteUrl || window.location.origin;
      const previewFiles = data?.data?.previewFiles || [];
      if (previewFiles.length > 0) {
        const params = new URLSearchParams();
        params.set("theme", "calcite");
        previewFiles.forEach((pf, i) => {
          const num = i + 1;
          const iterName = rowsForGeneration[i]?.iterationName?.trim() || pf.name || `sip-${num}`;
          params.set(`n${num}`, iterName);
          params.set(`m${num}`, pf.path);
        });
        setPreviewUrl(`${siteUrl}/preview?${params.toString()}`);
      }

      setRows([createRow(1)]);
      setNextRowId(2);
    } catch (error) {
      setStatusMessage(error?.message || "Generation failed.");
      setPreviewUrl("");
    } finally {
      setIsGenerating(false);
    }
  };

  const filledRowCount = rows.filter(
    (row) => !!row.files.portrait || !!row.files.landscape
  ).length;

  const getStatusStyle = () => {
    const s = statusMessage.toLowerCase();
    if (s.includes("fail") || s.includes("error") || s.includes("cannot") || s.includes("exceed") || s.includes("no files"))
      return { background: "var(--plec-red-soft)", color: "var(--plec-red-text)", border: "1px solid var(--plec-red-soft)" };
    if (s.includes("generated") || s.includes("assigned"))
      return { background: "var(--plec-green-soft)", color: "var(--plec-green-text)", border: "1px solid var(--plec-green-soft)" };
    return { background: "var(--plec-amber-soft)", color: "var(--plec-amber-text)", border: "1px solid var(--plec-amber-border)" };
  };

  const S = {
    label: { display: "block", marginBottom: 6, fontSize: 11, fontWeight: 600, color: "var(--plec-text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" },
    grid2: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 },
  };

  return (
    <div style={{
      position: "relative",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif",
    }}>
      {/* Generating overlay */}
      {isGenerating && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--plec-overlay)", backdropFilter: "blur(12px)", padding: 16 }}>
          <div style={{ width: "100%", maxWidth: 340, borderRadius: 28, background: "var(--plec-surface)", border: "1px solid var(--plec-border)", padding: "36px 32px", textAlign: "center", boxShadow: "var(--plec-shadow-lg)" }}>
            <div style={{ position: "relative", margin: "0 auto 20px", width: 56, height: 56 }}>
              <div className="animate-ping" style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "var(--plec-accent-soft)" }} />
              <div className="animate-spin" style={{ position: "absolute", inset: 4, borderRadius: "50%", border: "2.5px solid var(--plec-border)", borderTopColor: "var(--plec-accent)" }} />
              <div style={{ position: "absolute", inset: 14, borderRadius: "50%", background: "var(--plec-surface)" }} />
            </div>
            <p style={{ fontSize: 15, fontWeight: 600, color: "var(--plec-text)", margin: 0 }}>Generating SIP files...</p>
            <p style={{ fontSize: 13, color: "var(--plec-text-muted)", margin: "6px 0 0" }}>Please don&apos;t refresh the page</p>
          </div>
        </div>
      )}

      {/* Content */}
      <div style={{ position: "relative", zIndex: 1, maxWidth: 1120, margin: "0 auto", padding: "28px 20px 48px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Instructions */}
          <Instructions />

          {/* Bulk Upload */}
          <div
            className="plec-card"
            style={{ overflow: "hidden", transition: "all 0.25s", boxShadow: isBulkDragging ? `0 0 0 2px var(--plec-accent), var(--plec-shadow)` : undefined }}
            onDragOver={handleBulkDragOver}
            onDragLeave={handleBulkDragLeave}
            onDrop={handleBulkDrop}
          >
            <label style={{ display: "flex", cursor: "pointer", alignItems: "center", gap: 14, padding: "16px 20px" }}>
              <div style={{
                width: 40, height: 40, flexShrink: 0, borderRadius: 12,
                background: isBulkDragging ? "var(--plec-accent-soft)" : "var(--plec-surface-alt)",
                color: isBulkDragging ? "var(--plec-accent)" : "var(--plec-text-muted)",
                display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s",
              }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--plec-text)" }}>Bulk Upload</span>
                <span style={{ fontSize: 12, color: "var(--plec-text-muted)", marginLeft: 6 }}>
                  Drop files or click &middot; Max {MAX_FILE_UPLOADS}/batch &middot; {MAX_COMBINED_UPLOAD_FILE_SIZE_LABEL}/row
                </span>
              </div>
              <input type="file" multiple accept=".mp4,.gif,video/mp4,image/gif" onChange={handleBulkUploadInputChange} style={{ display: "none" }} />
            </label>
          </div>

          {/* SIP Rows */}
          {rows.map((row, index) => {
            const rowKey = `row-${row.id}`;
            const hasDup = areFilesSame(row.files.portrait, row.files.landscape);
            const complete = !!row.files.portrait && !!row.files.landscape;

            return (
              <div
                key={rowKey}
                className="plec-card animate-fade-in-up"
                style={{ overflow: "hidden", animationDelay: `${index * 60}ms`, boxShadow: hasDup ? `inset 0 0 0 1.5px var(--plec-red), var(--plec-shadow)` : undefined }}
              >
                {/* Row header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", borderBottom: "1px solid var(--plec-border)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                      width: 26, height: 26, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 11, fontWeight: 700,
                      background: complete ? "var(--plec-green-soft)" : "var(--plec-surface-alt)",
                      color: complete ? "var(--plec-green)" : "var(--plec-text-muted)",
                      transition: "all 0.3s",
                    }}>
                      {complete ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      ) : index + 1}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--plec-text)" }}>Row {index + 1}</span>
                    {hasDup && <span className="plec-badge" style={{ background: "var(--plec-red-soft)", color: "var(--plec-red-text)", fontSize: 10 }}>Duplicate</span>}
                  </div>
                  <button
                    type="button" onClick={() => removeRow(row.id)} disabled={rows.length === 1}
                    style={{ width: 26, height: 26, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", border: "none", background: "transparent", color: "var(--plec-text-muted)", cursor: "pointer", opacity: rows.length === 1 ? 0.25 : 1, transition: "all 0.15s" }}
                    onMouseEnter={(e) => { if (rows.length > 1) { e.currentTarget.style.background = "var(--plec-red-soft)"; e.currentTarget.style.color = "var(--plec-red)"; } }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--plec-text-muted)"; }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>

                {/* Row body */}
                <div style={{ padding: "18px 20px 20px" }}>
                  <div style={S.grid2}>
                    <div>
                      <div style={S.label}>Portrait</div>
                      <FileDropZone inputId={`portrait-${rowKey}`} label="Drop portrait file" value={row.files.portrait || null} onChange={(f) => setRowFile(row.id, "portrait", f)} />
                    </div>
                    <div>
                      <div style={S.label}>Landscape</div>
                      <FileDropZone inputId={`landscape-${rowKey}`} label="Drop landscape file" value={row.files.landscape || null} onChange={(f) => setRowFile(row.id, "landscape", f)} />
                    </div>
                  </div>

                  <div style={{ ...S.grid2, marginTop: 14 }}>
                    <div>
                      <div style={S.label}>Filename</div>
                      <input type="text" className="plec-input" placeholder="Auto-generated" value={row.filename} onChange={(e) => setRowText(row.id, "filename", e.target.value)} />
                    </div>
                    <div>
                      <div style={S.label}>Iteration</div>
                      <input type="text" className="plec-input" placeholder="Auto-generated" value={row.iterationName} onChange={(e) => setRowText(row.id, "iterationName", e.target.value)} />
                    </div>
                  </div>

                  <div style={{ marginTop: 14 }}>
                    <div style={S.label}>Networks</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {adNetworkOptions.map((opt) => {
                        const on = row.adNetworks.includes(opt);
                        const c = networkColors[opt] || networkColors.AppLovin;
                        return (
                          <button key={`${rowKey}-${opt}`} type="button" onClick={() => toggleAdNetwork(row.id, opt)}
                            style={{
                              padding: "5px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer",
                              transition: "all 0.2s cubic-bezier(0.16,1,0.3,1)",
                              border: on ? `1.5px solid ${c.border}` : "1.5px solid var(--plec-border)",
                              background: on ? c.bg : "transparent",
                              color: on ? c.color : "var(--plec-text-muted)",
                              transform: on ? "scale(1.02)" : "scale(1)",
                            }}
                          >{opt}</button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Actions */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, paddingTop: 4 }}>
            <button type="button" onClick={addRow}
              style={{
                display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 20px", borderRadius: 14,
                border: "1px solid var(--plec-border)", background: "var(--plec-surface)", color: "var(--plec-text-secondary)",
                fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.2s", boxShadow: "var(--plec-shadow)",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--plec-accent)"; e.currentTarget.style.color = "var(--plec-accent-text)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--plec-border)"; e.currentTarget.style.color = "var(--plec-text-secondary)"; }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
              Add Row
            </button>
            <button type="button" onClick={handleGenerate} disabled={isGenerating}
              style={{
                display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 28px", borderRadius: 14,
                border: "none", background: "var(--plec-header-bg)", backgroundSize: "200% 200%",
                color: "#fff", fontSize: 13, fontWeight: 600,
                cursor: isGenerating ? "not-allowed" : "pointer", opacity: isGenerating ? 0.5 : 1,
                transition: "all 0.25s", boxShadow: "0 4px 16px var(--plec-accent-glow)",
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
              {isGenerating ? "Generating..." : `Generate${filledRowCount > 0 ? ` (${filledRowCount})` : ""}`}
            </button>
          </div>

          {/* Status */}
          {statusMessage && (
            <div className="animate-fade-in-up" style={{ borderRadius: 14, padding: "12px 16px", fontSize: 13, fontWeight: 500, ...getStatusStyle() }}>
              <p style={{ margin: 0 }}>{statusMessage}</p>
            </div>
          )}

          {/* Preview URL */}
          {previewUrl && (
            <div className="plec-card animate-fade-in-up" style={{ overflow: "hidden" }}>
              <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--plec-border)", display: "flex", alignItems: "center", gap: 8 }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="var(--plec-accent)" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--plec-text)" }}>Preview URL</span>
                <button
                  type="button"
                  onClick={() => { navigator.clipboard.writeText(previewUrl); }}
                  style={{
                    marginLeft: "auto", padding: "4px 10px", borderRadius: 6,
                    border: "1px solid var(--plec-border)", background: "var(--plec-surface-alt)",
                    fontSize: 11, fontWeight: 600, color: "var(--plec-text-muted)", cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--plec-accent)"; e.currentTarget.style.color = "var(--plec-accent)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--plec-border)"; e.currentTarget.style.color = "var(--plec-text-muted)"; }}
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
                    color: "var(--plec-accent)", wordBreak: "break-all", lineHeight: 1.5,
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
    </div>
  );
}
