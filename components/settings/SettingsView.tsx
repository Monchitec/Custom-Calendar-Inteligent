"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Palette, Users } from "lucide-react";
import { cn } from "@/lib/cn";
import { ProfileCustomizer } from "./ProfileCustomizer";
import { ThemeSelector } from "./ThemeSelector";

type SettingsTab = "perfiles" | "apariencia";

const TABS: Array<{
  id: SettingsTab;
  label: string;
  icon: typeof Palette;
}> = [
  { id: "perfiles", label: "Perfiles", icon: Users },
  { id: "apariencia", label: "Apariencia y Temas", icon: Palette },
];

export function SettingsView() {
  const searchParams = useSearchParams();
  const initialParam = searchParams.get("tab");
  const initialTab: SettingsTab =
    initialParam === "apariencia" ? "apariencia" : "perfiles";

  const [tab, setTab] = useState<SettingsTab>(initialTab);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-foreground text-2xl font-extrabold tracking-tight sm:text-3xl">
          Configuración y Personalización
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Personaliza tus perfiles con foto y color, paleta de temas y modo
          claro/oscuro
        </p>
      </div>

      {/* Pestañas de Configuración */}
      <div
        role="tablist"
        aria-label="Secciones de configuración"
        className="border-border bg-card flex flex-wrap gap-2 rounded-3xl border p-2 shadow-2xs"
      >
        {TABS.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(item.id)}
              className={cn(
                "flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition-all sm:flex-initial",
                active
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {tab === "perfiles" && <ProfileCustomizer />}
      {tab === "apariencia" && <ThemeSelector />}
    </div>
  );
}
