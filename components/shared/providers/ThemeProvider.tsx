"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { readStorage, writeStorage } from "@/lib/storage";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { dbFetchTheme, dbUpdateSettings } from "@/lib/supabase/db";
import { DEFAULT_THEME_CONFIG } from "@/lib/themes";
import type {
  ColorMode,
  DisplayDensity,
  ThemeConfig,
  ThemePresetId,
} from "@/types/theme";

const THEME_STORAGE_KEY = "calendario_hub_theme_v1";

interface ThemeContextValue {
  config: ThemeConfig;
  setPreset: (preset: ThemePresetId) => void;
  setMode: (mode: ColorMode) => void;
  toggleMode: () => void;
  setDensity: (density: DisplayDensity) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyThemeToDom(config: ThemeConfig): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.dataset.theme = config.preset;
  root.dataset.mode = config.mode;
  root.dataset.density = config.density;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<ThemeConfig>(DEFAULT_THEME_CONFIG);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => {
      const saved = readStorage<ThemeConfig>(
        THEME_STORAGE_KEY,
        DEFAULT_THEME_CONFIG,
      );
      const merged: ThemeConfig = {
        preset: saved.preset ?? DEFAULT_THEME_CONFIG.preset,
        mode: saved.mode ?? DEFAULT_THEME_CONFIG.mode,
        density: saved.density ?? DEFAULT_THEME_CONFIG.density,
      };
      setConfig(merged);
      applyThemeToDom(merged);
      setHydrated(true);

      if (isSupabaseConfigured()) {
        void dbFetchTheme().then((remote) => {
          if (remote && remote.preset) {
            const remoteTheme: ThemeConfig = {
              preset: remote.preset ?? merged.preset,
              mode: remote.mode ?? merged.mode,
              density: remote.density ?? merged.density,
            };
            setConfig(remoteTheme);
            applyThemeToDom(remoteTheme);
            writeStorage(THEME_STORAGE_KEY, remoteTheme);
          }
        });
      }
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    applyThemeToDom(config);
    writeStorage(THEME_STORAGE_KEY, config);

    if (!isSupabaseConfigured()) return;
    const timer = window.setTimeout(() => {
      void dbUpdateSettings({ theme: config });
    }, 400);
    return () => window.clearTimeout(timer);
  }, [config, hydrated]);

  const setPreset = useCallback((preset: ThemePresetId) => {
    setConfig((prev) => ({ ...prev, preset }));
  }, []);

  const setMode = useCallback((mode: ColorMode) => {
    setConfig((prev) => ({ ...prev, mode }));
  }, []);

  const toggleMode = useCallback(() => {
    setConfig((prev) => ({
      ...prev,
      mode: prev.mode === "light" ? "dark" : "light",
    }));
  }, []);

  const setDensity = useCallback((density: DisplayDensity) => {
    setConfig((prev) => ({ ...prev, density }));
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ config, setPreset, setMode, toggleMode, setDensity }),
    [config, setPreset, setMode, toggleMode, setDensity],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme debe utilizarse dentro de ThemeProvider");
  }
  return ctx;
}
