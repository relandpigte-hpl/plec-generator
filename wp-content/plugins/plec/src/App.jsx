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
  appStoreUrl: {
    iOS: null,
    Android: null,
  }
});

const parseNamingFromAssetFilename = (fileName) => {
  const nameWithoutExtension = fileName.replace(/\.[^/.]+$/, "");
  const coreNameMatch = nameWithoutExtension.match(
    /^(.*?_sip_\d{8}_\d{2})_.+_(portrait|landscape)$/i
  );

  if (!coreNameMatch) {
    return null;
  }

  const filenameValue = coreNameMatch[1];
  const iterationMatch = filenameValue.match(/(sip_\d{8}_\d{2})/i);

  return {
    filename: filenameValue,
    iterationName: iterationMatch ? iterationMatch[1].toLowerCase() : null,
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
                return nextRow;
              }

              const parsedNaming = parseNamingFromAssetFilename(file.name);
              if (!parsedNaming) {
                return nextRow;
              }

              return {
                ...nextRow,
                filename: nextRow.filename.trim()
                  ? nextRow.filename
                  : parsedNaming.filename,
                iterationName: nextRow.iterationName.trim()
                  ? nextRow.iterationName
                  : parsedNaming.iterationName || nextRow.iterationName,
              };
            })()
          : row
      );

      return withAutoAppendedRow(updatedRows);
    });
  };

  const toggleAdNetwork = (rowId, network) => {
    if (network !== defaultAdNetwork) {
      return;
    }

    setRows((current) =>
      current.map((row) => {
        if (row.id !== rowId) {
          return row;
        }

        return {
          ...row,
          adNetworks: [defaultAdNetwork],
        };
      })
    );
  };

  const setRowText = (rowId, key, value) => {
    setRows((current) =>
      current.map((row) => (row.id === rowId ? { ...row, [key]: value } : row))
    );
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

    selectedFiles.forEach((file) => {
      const rowNumber = parseRowNumberFromAssetFilename(file.name);
      const assetType = parseAssetTypeFromAssetFilename(file.name);

      if (!rowNumber || !assetType) {
        skippedCount += 1;
        return;
      }

      matchedUploads.push({ file, rowNumber, assetType });
    });

    if (matchedUploads.length === 0) {
      setStatusMessage(
        "No files were matched. Use names that include _NN_ and end with _portrait or _landscape."
      );
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

        if (!targetRow.iterationName.trim() && parsedNaming.iterationName) {
          targetRow.iterationName = parsedNaming.iterationName;
        }
      });

      const compactedRows = updatedRows.filter(hasAnyRowFile);

      return compactedRows.length > 0 ? compactedRows : [createRow(1)];
    });

    const messageSuffix =
      skippedCount > 0
        ? ` ${skippedCount} file(s) were skipped because the name did not match the pattern.`
        : "";

    setStatusMessage(
      `Assigned ${matchedUploads.length} file(s) to ${assignedSlots.size} slot(s).${messageSuffix}`
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
    const uploadLimit = Number.isFinite(maxFileUploads) && maxFileUploads > 0
      ? maxFileUploads
      : 20;
    const requiredUploads = rowsForGeneration.length * 2;

    if (requiredUploads > uploadLimit) {
      const maxRows = Math.floor(uploadLimit / 2);
      setStatusMessage(
        `Too many files for one request. You selected ${rowsForGeneration.length} rows (${requiredUploads} files), but the server limit is ${uploadLimit} files (about ${maxRows} row(s)). Generate in smaller batches or increase PHP max_file_uploads.`
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

    const payloadRows = rowsForGeneration.map((row, index) => {
      const baseName = row.filename.trim() || `sip-${index + 1}`;
      const fileName = /\.html?$/i.test(baseName) ? baseName : `${baseName}.html`;

      return {
        id: row.id,
        filename: fileName,
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
      setRows([createRow(1)]);
      setNextRowId(2);
    } catch (error) {
      setStatusMessage(error?.message || "Generation failed.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="mx-auto my-6 font-sans flex flex-col gap-5">
      <Instructions />
      <div
        className={`rounded border border-dashed p-3 transition-colors ${
          isBulkDragging
            ? "border-blue-500 bg-blue-50"
            : "border-slate-300 bg-slate-50"
        }`}
        onDragOver={handleBulkDragOver}
        onDragLeave={handleBulkDragLeave}
        onDrop={handleBulkDrop}
      >
        <label className="flex cursor-pointer flex-col gap-1 text-sm text-slate-800">
          <span className="font-medium">Bulk Upload</span>
          <span className="text-xs text-slate-600 text-wrap break-words">
            Upload multiple files. For best results, use this example naming pattern: <code className="text-amber-600">projectName_sip_YYYYMMDD_NN_clientName|conceptName_portrait|landscape.ext</code>.
          </span>
          <span className="text-xs text-slate-600">
            Drag and drop files here, or click to choose files.
          </span>
          <input
            type="file"
            multiple
            onChange={handleBulkUploadInputChange}
            className="hidden"
          />
        </label>
      </div>
      <div className="overflow-x-auto rounded border border-slate-200 bg-white">
        <table className="w-full min-w-245 border-collapse">
          <thead>
            <tr>
              <th className="plec-th">Ad Network</th>
              <th className="plec-th">Portrait File</th>
              <th className="plec-th">Landscape File</th>
              <th className="plec-th">Filename</th>
              <th className="plec-th">Iteration Name</th>
              <th className="plec-th">&nbsp;</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const rowKey = `row-${row.id}`;
              const hasDuplicateMedia = areFilesSame(
                row.files.portrait,
                row.files.landscape
              );

              return (
                <tr
                  key={rowKey}
                  className={`${
                    hasDuplicateMedia ? "bg-red-50" : ""
                  } hover:bg-slate-50`}
                >
                  <td className="plec-td">
                    <div className="grid grid-cols-none gap-x-3 gap-y-1.5">
                      {adNetworkOptions.map((option) => (
                        <label key={`${rowKey}-${option}`} className="flex items-center gap-1 text-xs text-slate-800">
                          <input
                            type="checkbox"
                            className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            checked={row.adNetworks.includes(option)}
                            disabled={option !== defaultAdNetwork}
                            onChange={() => toggleAdNetwork(row.id, option)}
                          />
                          <span>{option}</span>
                        </label>
                      ))}
                    </div>
                  </td>
                  <td className="plec-td">
                    <FileDropZone
                      inputId={`portrait-${rowKey}`}
                      label="Drop portrait file"
                      value={row.files.portrait || null}
                      onChange={(file) => setRowFile(row.id, "portrait", file)}
                    />
                  </td>
                  <td className="plec-td">
                    <FileDropZone
                      inputId={`landscape-${rowKey}`}
                      label="Drop landscape file"
                      value={row.files.landscape || null}
                      onChange={(file) => setRowFile(row.id, "landscape", file)}
                    />
                  </td>
                  <td className="plec-td w-1/4">
                    <input
                      type="text"
                      className="plec-input"
                      value={row.filename}
                      onChange={(event) => setRowText(row.id, "filename", event.target.value)}
                    />
                  </td>
                  <td className="plec-td w-1/4">
                    <input
                      type="text"
                      className="plec-input"
                      value={row.iterationName}
                      onChange={(event) => setRowText(row.id, "iterationName", event.target.value)}
                    />
                  </td>
                  <td className="plec-td">
                    <button className="button" type="button" onClick={() => removeRow(row.id)} disabled={rows.length === 1}>
                      x
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="footer flex gap-5 md:flex-row flex-col">
        <button className="button min-w-50" type="button" onClick={addRow}>
          Add another SIP
        </button>
        <button
          className="button bg-blue-500! hover:bg-blue-700! text-white! min-w-50 disabled:cursor-not-allowed disabled:opacity-60"
          type="button"
          onClick={handleGenerate}
          disabled={isGenerating}
        >
          {isGenerating ? "Generating..." : "Generate"}
        </button>
      </div>
      {statusMessage ? (
        <div className="notice">
          <p className="text-sm text-slate-700">{statusMessage}</p>
        </div>
      ) : null}
    </div>
  );
}
