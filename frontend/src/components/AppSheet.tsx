"use client";

import React, { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";

const SIZE: Record<string, string> = {
  md: "sm:max-w-md",
  lg: "sm:max-w-lg",
  xl: "sm:max-w-xl",
  "2xl": "sm:max-w-2xl",
  "3xl": "sm:max-w-3xl",
  "4xl": "sm:max-w-4xl",
};

export default function AppSheet({
  open,
  onClose,
  title,
  children,
  footer = null,
  size = "md",
  as: As = "div",
  onSubmit,
  closeTestId = "sheet-close",
  showHandle = true,
  autoFocus = true,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl";
  as?: "div" | "form";
  onSubmit?: (e: React.FormEvent) => void;
  closeTestId?: string;
  showHandle?: boolean;
  autoFocus?: boolean;
}) {
  const titleId = useId();
  const panelRef = useRef<any>(null);
  const bodyRef = useRef<any>(null);
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

  useEffect(() => {
    if (!open || !autoFocus) return undefined;
    const t = window.setTimeout(() => {
      const field = bodyRef.current?.querySelector(
        "input:not([disabled]):not([type='hidden']), textarea:not([disabled]), select:not([disabled])"
      );
      if (field) {
        field.focus();
        return;
      }
      panelRef.current?.focus();
    }, 50);
    return () => window.clearTimeout(t);
  }, [open, autoFocus]);

  if (!open || typeof document === "undefined") return null;

  const sizeClass = SIZE[size] || SIZE.md;
  const requestClose = () => onCloseRef.current?.();

  const panel = (
    <As
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
      tabIndex={-1}
      onClick={(e: React.MouseEvent) => e.stopPropagation()}
      onSubmit={As === "form" ? onSubmit : undefined}
      className={`relative z-[61] w-full ${sizeClass} bg-white shadow-2xl flex flex-col overflow-hidden
        max-h-[min(92dvh,100%)] sm:max-h-[90vh]
        rounded-t-3xl sm:rounded-3xl
        mt-auto sm:mt-0
        outline-none
        animate-fade-in-up`}
    >
      {showHandle ? (
        <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0" aria-hidden>
          <div className="w-10 h-1 rounded-full bg-brand-border" />
        </div>
      ) : null}

      {title ? (
        <div className="shrink-0 flex items-center justify-between gap-3 px-4 sm:px-5 pt-2 sm:pt-4 pb-2.5 border-b border-brand-border/60">
          <h3 id={titleId} className="font-display font-bold text-lg truncate">
            {title}
          </h3>
          <button
            type="button"
            data-testid={closeTestId}
            onClick={requestClose}
            className="min-h-[44px] min-w-[44px] rounded-full text-muted-foreground hover:text-foreground hover:bg-brand-surface inline-flex items-center justify-center text-sm font-medium cursor-pointer"
          >
            Close
          </button>
        </div>
      ) : null}

      <div
        ref={bodyRef}
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 sm:px-5 py-3"
      >
        {children}
      </div>

      {footer ? (
        <div className="shrink-0 border-t border-brand-border bg-white px-4 sm:px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] sm:pb-4">
          {footer}
        </div>
      ) : (
        <div className="shrink-0 pb-[env(safe-area-inset-bottom,0px)] sm:pb-0" />
      )}
    </As>
  );

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex flex-col justify-end sm:justify-center sm:items-center sm:p-4"
      data-testid="app-sheet-root"
    >
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 z-[60] bg-neutral-900/40 backdrop-blur-md border-0 cursor-default transition-all duration-300"
        onClick={requestClose}
      />
      {panel}
    </div>,
    document.body
  );
}
