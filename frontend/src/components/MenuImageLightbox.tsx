"use client";

import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "@phosphor-icons/react";

/**
 * Full-viewport menu image viewer (not a constrained sheet/popup).
 * Tall menus scroll; image uses the full screen width.
 */
export default function MenuImageLightbox({
  open,
  onClose,
  src,
  label,
}: {
  open: boolean;
  onClose: () => void;
  src?: string | null;
  label?: string;
}) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current?.();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!open || !src || typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={label || "Menu"}
      data-testid="menu-image-viewer"
      className="fixed inset-0 z-[100] flex flex-col bg-black"
    >
      <div className="shrink-0 flex items-center justify-between gap-3 px-3 py-2.5 sm:px-4 bg-black/90 text-white border-b border-white/10">
        <h2 className="font-display font-bold text-base sm:text-lg truncate min-w-0">
          {label || "Menu"}
        </h2>
        <button
          type="button"
          data-testid="menu-image-viewer-close"
          onClick={() => onCloseRef.current?.()}
          className="shrink-0 inline-flex items-center gap-1.5 h-10 px-3 rounded-full bg-white/10 hover:bg-white/20 text-sm font-medium cursor-pointer"
          aria-label="Close"
        >
          <X size={18} weight="bold" />
          Close
        </button>
      </div>
      <div
        className="flex-1 min-h-0 overflow-auto overscroll-contain"
        onClick={() => onCloseRef.current?.()}
      >
        <div className="min-h-full w-full flex items-start justify-center p-0 sm:p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            data-testid="menu-image-viewer-img"
            src={src}
            alt={label || "Menu"}
            className="w-full max-w-none h-auto object-contain select-none"
            onClick={(e) => e.stopPropagation()}
            draggable={false}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}
