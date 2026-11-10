export const REFRESH_OPTIONS = [0, 5, 10, 30, 60] as const;
export type RefreshInterval = (typeof REFRESH_OPTIONS)[number];

export const ACCENTS = {
  mint: { label: "Mint", hue: 172 },
  cyan: { label: "Cyan", hue: 215 },
  violet: { label: "Violet", hue: 290 },
  amber: { label: "Amber", hue: 75 },
  rose: { label: "Rose", hue: 10 },
} as const;
export type Accent = keyof typeof ACCENTS;
export type ThemeMode = "dark" | "light";

export interface Settings {
  /** Seconds between inbox checks; 0 turns auto-refresh off. */
  refreshInterval: RefreshInterval;
  sound: boolean;
  popups: boolean;
  theme: ThemeMode;
  accent: Accent;
  displayName: string;
  signature: string;
}

export const DEFAULT_SETTINGS: Settings = {
  refreshInterval: 10,
  sound: false,
  popups: true,
  theme: "dark",
  accent: "mint",
  displayName: "",
  signature: "",
};

export const SETTINGS_KEY = "umbra-mail.settings.v1";

/** Accept only known values so a corrupted or old saved copy never breaks the app. */
export function reviveSettings(raw: unknown): Settings {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<Record<keyof Settings, unknown>>;
  const pick = <K extends keyof Settings>(k: K, ok: (v: unknown) => boolean) =>
    (ok(r[k]) ? r[k] : DEFAULT_SETTINGS[k]) as Settings[K];
  return {
    refreshInterval: pick("refreshInterval", (v) => REFRESH_OPTIONS.includes(v as RefreshInterval)),
    sound: pick("sound", (v) => typeof v === "boolean"),
    popups: pick("popups", (v) => typeof v === "boolean"),
    theme: pick("theme", (v) => v === "dark" || v === "light"),
    accent: pick("accent", (v) => typeof v === "string" && v in ACCENTS),
    displayName: pick("displayName", (v) => typeof v === "string"),
    signature: pick("signature", (v) => typeof v === "string"),
  };
}

/** Inline script that applies the saved theme before first paint (avoids a flash). */
export const THEME_BOOT_SCRIPT = `(function(){try{var s=JSON.parse(localStorage.getItem(${JSON.stringify(
  SETTINGS_KEY,
)})||"{}");var d=document.documentElement;d.dataset.theme=s.theme==="light"?"light":"dark";d.dataset.accent=typeof s.accent==="string"?s.accent:"mint";}catch(e){}})();`;
