"use client";

import { useEffect, useId, useRef } from "react";
import { registerDialog } from "./historyEntry";

/**
 * Accessible modal dialog: focus moves in and is trapped, Escape and the
 * close button dismiss it, the browser/mobile Back button closes it (via a
 * history entry) and focus returns to whatever opened it.
 */

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([tabindex="-1"]), select:not([disabled]), textarea:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])';

export function Dialog({
  title,
  onClose,
  children,
  size = "lg",
  headerExtra,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  size?: "md" | "lg" | "xl";
  headerExtra?: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const unregister = registerDialog(() => onCloseRef.current());
    // Focus the title so screen readers announce the dialog, keyboard users can Tab in.
    // (Unless the visitor already clicked into the dialog, e.g. a form field.)
    requestAnimationFrame(() => {
      const el = ref.current;
      if (el && !el.contains(document.activeElement)) el.querySelector<HTMLElement>("[data-dialog-title]")?.focus();
    });
    return () => {
      unregister();
      if (opener && document.contains(opener)) opener.focus({ preventScroll: true });
    };
  }, []);

  const onKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    if (e.key !== "Tab" || !ref.current) return;
    const items = [...ref.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null || el === document.activeElement);
    if (items.length === 0) return;
    const first = items[0]!;
    const last = items[items.length - 1]!;
    if (e.shiftKey && (document.activeElement === first || document.activeElement === ref.current.querySelector("[data-dialog-title]"))) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const width = size === "md" ? "max-w-2xl" : size === "xl" ? "max-w-6xl" : "max-w-4xl";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" onKeyDown={onKeyDown}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`animate-fade-up relative flex max-h-[100dvh] w-full ${width} flex-col overflow-hidden bg-surface shadow-[var(--shadow-panel)] sm:max-h-[90dvh] sm:rounded-2xl`}
      >
        <header className="flex items-center justify-between gap-4 border-b border-line px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6">
          <h2 id={titleId} data-dialog-title tabIndex={-1} className="eyebrow outline-none">
            {title}
          </h2>
          <div className="flex items-center gap-2">
            {headerExtra}
            <button onClick={onClose} className="btn btn-ghost !min-h-10 !px-3" aria-label="Close">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
              <span className="hidden text-sm sm:inline">Close</span>
            </button>
          </div>
        </header>
        <div className="scrollbar-thin overflow-y-auto overscroll-contain px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-8">{children}</div>
      </div>
    </div>
  );
}
