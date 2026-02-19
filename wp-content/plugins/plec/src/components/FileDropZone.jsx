import React, { useState } from "react";

export default function FileDropZone({ value, onChange, inputId, label }) {
  const [isDragging, setIsDragging] = useState(false);

  const onDragOver = (event) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      onChange(file);
    }
  };

  const onInputChange = (event) => {
    const file = event.target.files?.[0] ?? null;
    onChange(file);
  };

  return (
    <label
      htmlFor={inputId}
      className={`flex w-60 cursor-pointer flex-col items-start gap-1 rounded border border-dashed p-2.5 ${
        isDragging
          ? "border-blue-600 bg-blue-50"
          : "border-slate-400 bg-slate-50 hover:border-slate-500"
      }`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <input
        id={inputId}
        className="hidden"
        type="file"
        accept=".mp4,.gif,video/mp4,image/gif"
        onChange={onInputChange}
      />
      <span className="text-xs text-slate-700">{label}</span>
      <span className="w-full truncate text-xs text-slate-900">
        {value ? value.name : "No file selected"}
      </span>
    </label>
  );
}
