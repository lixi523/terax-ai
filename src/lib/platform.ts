import { platform } from "@tauri-apps/plugin-os";

const PLATFORM = (() => {
  try {
    return platform();
  } catch {
    return "";
  }
})();

export const IS_WINDOWS = PLATFORM === "windows";

/** Custom window controls (min/max/close) are rendered by us — Terax draws
 * its own titlebar on every supported platform. */
export const USE_CUSTOM_WINDOW_CONTROLS = PLATFORM !== "";

export const MOD_KEY = "Ctrl";
/** KeyBinding property name for the platform's primary modifier. */
export const MOD_PROP: "ctrl" = "ctrl";
/** Ctrl: the native file-manager convention for toggling one item in/out of
 * a multi-selection. */
export function isPrimaryModifierPressed(e: {
  metaKey: boolean;
  ctrlKey: boolean;
}): boolean {
  return e.ctrlKey;
}
export const CTRL_KEY = "Ctrl";
export const ALT_KEY = "Alt";
export const SHIFT_KEY = "Shift";
export const TAB_KEY = "Tab";
export const ENTER_KEY = "Enter";

export const KEY_SEP = "+";

export function fmtShortcut(...parts: string[]): string {
  return parts.join(KEY_SEP);
}
