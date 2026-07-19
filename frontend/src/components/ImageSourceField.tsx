"use client";

import React, { useEffect, useRef, useState } from "react";
import { Camera, UploadSimple, X } from "@phosphor-icons/react";

const DEFAULT_ACCEPT = "image/jpeg,image/png,image/webp";

type Props = {
  label?: string;
  value?: File | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
  accept?: string;
  /** Prefix for data-testid (camera / upload / clear / preview). */
  testid?: string;
  optional?: boolean;
  previewShape?: "rect" | "circle";
  /** Server image when there is no local File yet (avatar / logo). */
  remotePreviewUrl?: string | null;
  showClear?: boolean;
  /** Hint under the buttons when empty. */
  /** Override data-testid on the gallery/upload input (legacy e2e ids). */
  uploadInputTestId?: string;
  cameraInputTestId?: string;
  emptyHint?: string;
};

export default function ImageSourceField({
  label,
  value = null,
  onChange,
  disabled = false,
  accept = DEFAULT_ACCEPT,
  testid = "image-source",
  optional = false,
  previewShape = "rect",
  remotePreviewUrl = null,
  showClear = true,
  uploadInputTestId,
  cameraInputTestId,
  emptyHint,
}: Props) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!value) {
      setLocalPreview(null);
      return;
    }
    const url = URL.createObjectURL(value);
    setLocalPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [value]);

  const previewSrc = localPreview || remotePreviewUrl || null;
  const shapeClass = previewShape === "circle" ? "rounded-full" : "rounded-xl";

  function pick(file: File | null) {
    onChange(file);
    if (cameraRef.current) cameraRef.current.value = "";
    if (uploadRef.current) uploadRef.current.value = "";
  }

  return (
    <div className="flex flex-col gap-2">
      {label ? (
        <span className="label-overline">
          {label}
          {optional ? " (optional)" : ""}
        </span>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          data-testid={`${testid}-camera`}
          disabled={disabled}
          onClick={() => cameraRef.current?.click()}
          className="h-11 px-4 rounded-full border border-brand-border bg-white text-sm font-medium inline-flex items-center gap-2 cursor-pointer hover:bg-brand-surface disabled:opacity-50"
        >
          <Camera size={18} weight="duotone" />
          Camera
        </button>
        <button
          type="button"
          data-testid={`${testid}-upload`}
          disabled={disabled}
          onClick={() => uploadRef.current?.click()}
          className="h-11 px-4 rounded-full border border-brand-border bg-white text-sm font-medium inline-flex items-center gap-2 cursor-pointer hover:bg-brand-surface disabled:opacity-50"
        >
          <UploadSimple size={18} />
          Upload
        </button>
        {showClear && (value || remotePreviewUrl) ? (
          <button
            type="button"
            data-testid={`${testid}-clear`}
            disabled={disabled}
            onClick={() => pick(null)}
            className="h-11 px-3 rounded-full border border-brand-border bg-white text-sm text-muted-foreground inline-flex items-center gap-1 cursor-pointer hover:bg-brand-surface disabled:opacity-50"
          >
            <X size={16} />
            Clear
          </button>
        ) : null}
      </div>

      <input
        ref={cameraRef}
        data-testid={cameraInputTestId || `${testid}-camera-input`}
        type="file"
        accept={accept}
        capture="environment"
        className="hidden"
        disabled={disabled}
        onChange={(e) => pick(e.target.files?.[0] || null)}
      />
      <input
        ref={uploadRef}
        data-testid={uploadInputTestId || `${testid}-upload-input`}
        type="file"
        accept={accept}
        className="hidden"
        disabled={disabled}
        onChange={(e) => pick(e.target.files?.[0] || null)}
      />

      {previewSrc ? (
        <div className="flex items-center gap-3 mt-1">
          <img
            src={previewSrc}
            alt=""
            data-testid={`${testid}-preview`}
            className={`h-16 w-16 object-cover border border-brand-border ${shapeClass}`}
          />
          {value ? (
            <span className="text-xs text-muted-foreground truncate max-w-48">{value.name}</span>
          ) : null}
        </div>
      ) : emptyHint ? (
        <p className="text-xs text-muted-foreground">{emptyHint}</p>
      ) : null}
    </div>
  );
}
