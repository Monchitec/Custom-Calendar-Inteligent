export type ThemePresetId =
  "rose" | "sage" | "ocean" | "lavender" | "sunset" | "minimal";

export type ColorMode = "light" | "dark";

export type DisplayDensity = "compact" | "comfortable" | "wall";

export type ProfileColorSlot =
  "cat-1" | "cat-2" | "cat-3" | "cat-4" | "cat-5" | "cat-6" | "cat-7";

export type CalendarColorSlot = ProfileColorSlot | "cat-bills";

export interface ThemeConfig {
  preset: ThemePresetId;
  mode: ColorMode;
  density: DisplayDensity;
}

export interface ThemePresetMeta {
  id: ThemePresetId;
  name: string;
  tagline: string;
  description: string;
}
