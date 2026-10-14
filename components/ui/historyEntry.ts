/**
 * One shared browser-history entry for "a dialog is open", so the device Back
 * button closes the top dialog instead of leaving the page.
 *
 * It also owns Escape handling for dialogs.
 *
 * Reference-counted: when one dialog replaces another in the same tick (e.g.
 * Stations menu → Booking panel) the entry is reused instead of racing an
 * async history.back() against a new pushState.
 */

type Closer = () => void;
const stack: Closer[] = [];
let entryActive = false;
let ignoreNextPop = false;
let pendingBack: ReturnType<typeof setTimeout> | null = null;
let listening = false;

function onPop() {
  if (ignoreNextPop) {
    ignoreNextPop = false;
    return;
  }
  if (!entryActive) return;
  entryActive = false;
  const top = stack[stack.length - 1];
  top?.();
  // Stacked dialogs remain: give them a fresh entry.
  queueMicrotask(() => {
    if (stack.length > 0 && !entryActive) {
      history.pushState({ ...(history.state ?? {}), ksvDialog: true }, "");
      entryActive = true;
    }
  });
}

/** Escape closes the top-most dialog wherever focus currently is. */
function onKey(e: KeyboardEvent) {
  if (e.key !== "Escape" || stack.length === 0) return;
  e.preventDefault();
  e.stopImmediatePropagation();
  stack[stack.length - 1]?.();
}

export function registerDialog(close: Closer): () => void {
  if (!listening) {
    window.addEventListener("popstate", onPop);
    window.addEventListener("keydown", onKey, true);
    listening = true;
  }
  if (pendingBack) {
    clearTimeout(pendingBack);
    pendingBack = null;
  }
  stack.push(close);
  if (!entryActive) {
    history.pushState({ ...(history.state ?? {}), ksvDialog: true }, "");
    entryActive = true;
  }
  return () => {
    const i = stack.lastIndexOf(close);
    if (i >= 0) stack.splice(i, 1);
    if (stack.length === 0 && entryActive && !pendingBack) {
      // Defer so a dialog opening in the same tick can adopt the entry.
      pendingBack = setTimeout(() => {
        pendingBack = null;
        if (stack.length === 0 && entryActive) {
          entryActive = false;
          // Only pop our own entry — not a page the visitor navigated to
          // from inside the dialog (e.g. "Open as page").
          if ((history.state as { ksvDialog?: boolean } | null)?.ksvDialog) {
            ignoreNextPop = true;
            history.back();
          }
        }
      }, 0);
    }
  };
}
