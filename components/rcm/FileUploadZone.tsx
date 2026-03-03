"use client";

import { useRef, useCallback, useState } from "react";

const ACCEPT = ".xlsx,.xls";

export interface FileUploadZoneProps {
  onFiles: (files: File[]) => void;
  accept?: string;
  label?: string;
  hint?: string;
  multiple?: boolean;
}

export function FileUploadZone({
  onFiles,
  accept = ACCEPT,
  label = "Drag and Drop",
  hint = "Accepted formats: XLSX, XLS",
  multiple = false,
}: FileUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const arr = Array.from(files).filter(
        (f) => f.name.endsWith(".xlsx") || f.name.endsWith(".xls")
      );
      if (arr.length) onFiles(multiple ? arr : [arr[0]]);
    },
    [onFiles, multiple]
  );

  return (
    <div className="space-y-2 animate-fade-in">
      <p className="text-sm text-muted-foreground">{hint}</p>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-12 transition-all duration-300 ease-out ${
          drag
            ? "scale-[1.02] border-primary-500 bg-primary-50 shadow-lg shadow-primary-500/10"
            : "border-border hover:border-primary/50 hover:bg-muted/50 hover:shadow-md active:scale-[0.99]"
        }`}
      >
        <div
          className={`mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 transition-transform duration-300 ${
            drag ? "scale-110" : ""
          }`}
        >
          <svg
            className="h-8 w-8 text-primary-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
        </div>
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="mt-1 text-sm text-muted-foreground">or click to browse</p>
        <span className="mt-3 inline-flex items-center rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-shadow hover:bg-primary/90">
          Select File
        </span>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
    </div>
  );
}
