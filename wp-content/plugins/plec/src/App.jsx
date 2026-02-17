import React, { useState } from "react";
import FileDropZone from "./components/FileDropZone";
import Instructions from "./components/Instructions";

const createRow = (id) => ({
  id,
  adNetworks: ["Facebook"],
  filename: `meta_campaign_${String.fromCharCode(96 + id)}.zip`,
  iterationName: `Iteration ${String(id).padStart(2, "0")}`,
  files: {
    portrait: null,
    landscape: null,
  },
});

export default function App() {
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

  const setRowFile = (rowId, type, file) => {
    setRows((current) =>
      current.map((row) =>
        row.id === rowId
          ? {
              ...row,
              files: {
                ...row.files,
                [type]: file,
              },
            }
          : row
      )
    );
  };

  const toggleAdNetwork = (rowId, network) => {
    setRows((current) =>
      current.map((row) => {
        if (row.id !== rowId) {
          return row;
        }

        const selected = row.adNetworks || [];
      const nextSelected = selected.includes(network)
        ? selected.filter((item) => item !== network)
        : [...selected, network];

        return {
          ...row,
          adNetworks: nextSelected,
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

  return (
    <div className="mx-auto my-6 max-w-275 font-sans flex flex-col gap-5">
      <Instructions />
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-245 border-collapse">
          <thead>
            <tr>
              <th className="plec-th">Ad Network</th>
              <th className="plec-th">Portrait File</th>
              <th className="plec-th">Landscape File</th>
              <th className="plec-th">Filename</th>
              <th className="plec-th">Iteration Name</th>
              <th className="plec-th">Remove SIP</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const rowKey = `row-${row.id}`;

              return (
                <tr key={rowKey} className="hover:bg-slate-50">
                  <td className="plec-td">
                    <div className="grid grid-cols-1 gap-x-3 gap-y-1.5">
                      {adNetworkOptions.map((option) => (
                        <label key={`${rowKey}-${option}`} className="flex items-center gap-1 text-xs text-slate-800">
                          <input
                            type="checkbox"
                            className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            checked={row.adNetworks.includes(option)}
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
                  <td className="plec-td">
                    <input
                      type="text"
                      className="plec-input"
                      value={row.filename}
                      onChange={(event) => setRowText(row.id, "filename", event.target.value)}
                    />
                  </td>
                  <td className="plec-td">
                    <input
                      type="text"
                      className="plec-input"
                      value={row.iterationName}
                      onChange={(event) => setRowText(row.id, "iterationName", event.target.value)}
                    />
                  </td>
                  <td className="plec-td">
                    <button className="button" type="button" onClick={() => removeRow(row.id)} disabled={rows.length === 1}>
                      X
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="footer flex gap-5">
        <button className="button min-w-50" type="button" onClick={addRow}>
          Add another SIP
        </button>
        <button className="button bg-blue-500! hover:bg-blue-700! text-white! min-w-50">Generate</button>
      </div>
      <div className="notice">
        <p className="text-sm text-slate-600">
          <span className="font-bold">Notice</span>: It may take up to a minute for preview content to be ready.
        </p>
      </div>
    </div>
  );
}
