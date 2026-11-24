"use client";

import { Check, Monitor, Moon, Palette, Sun } from "lucide-react";
import { useTheme } from "@/components/shared/providers/ThemeProvider";
import { cn } from "@/lib/cn";
import { DENSITY_OPTIONS, THEME_PRESETS } from "@/lib/themes";

export function ThemeSelector() {
  const { config, setPreset, setMode, setDensity } = useTheme();

  return (
    <div className="space-y-6">
      {/* Modo Claro / Oscuro */}
      <section className="border-border bg-card rounded-3xl border p-5 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="bg-primary-soft text-primary flex h-10 w-10 items-center justify-center rounded-2xl">
            {config.mode === "dark" ? (
              <Moon className="h-5 w-5" />
            ) : (
              <Sun className="h-5 w-5" />
            )}
          </div>
          <div>
            <h2 className="text-foreground text-base font-extrabold">
              Modo de iluminación
            </h2>
            <p className="text-muted-foreground text-xs">
              Todas las temáticas adaptan su contraste automáticamente en modo
              claro y oscuro
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setMode("light")}
            className={cn(
              "flex min-h-16 cursor-pointer items-center justify-between rounded-2xl border p-4 text-left transition-all",
              config.mode === "light"
                ? "border-primary bg-primary-soft/50 ring-primary/25 ring-2"
                : "border-border bg-background hover:bg-card-hover",
            )}
          >
            <div className="flex items-center gap-3">
              <div className="bg-warning-soft text-warning flex h-10 w-10 items-center justify-center rounded-xl">
                <Sun className="h-5 w-5" />
              </div>
              <div>
                <p className="text-foreground text-sm font-bold">Modo Claro</p>
                <p className="text-muted-foreground text-xs">
                  Luminoso, cálido e ideal para el día
                </p>
              </div>
            </div>
            {config.mode === "light" && (
              <span className="bg-primary text-primary-foreground flex h-6 w-6 items-center justify-center rounded-full">
                <Check className="h-4 w-4" />
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setMode("dark")}
            className={cn(
              "flex min-h-16 cursor-pointer items-center justify-between rounded-2xl border p-4 text-left transition-all",
              config.mode === "dark"
                ? "border-primary bg-primary-soft/50 ring-primary/25 ring-2"
                : "border-border bg-background hover:bg-card-hover",
            )}
          >
            <div className="flex items-center gap-3">
              <div className="bg-secondary-soft text-secondary flex h-10 w-10 items-center justify-center rounded-xl">
                <Moon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-foreground text-sm font-bold">Modo Oscuro</p>
                <p className="text-muted-foreground text-xs">
                  Descansado para la noche y pantallas de pared
                </p>
              </div>
            </div>
            {config.mode === "dark" && (
              <span className="bg-primary text-primary-foreground flex h-6 w-6 items-center justify-center rounded-full">
                <Check className="h-4 w-4" />
              </span>
            )}
          </button>
        </div>
      </section>

      {/* Selector de Paletas Temáticas */}
      <section className="border-border bg-card rounded-3xl border p-5 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="bg-primary-soft text-primary flex h-10 w-10 items-center justify-center rounded-2xl">
            <Palette className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-foreground text-base font-extrabold">
              Temática de colores
            </h2>
            <p className="text-muted-foreground text-xs">
              Elige una paleta armónica completa: actualiza superficies,
              botones, acentos y perfiles al instante
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {THEME_PRESETS.map((preset) => {
            const active = config.preset === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => setPreset(preset.id)}
                className={cn(
                  "group flex cursor-pointer flex-col overflow-hidden rounded-3xl border text-left transition-all",
                  active
                    ? "border-primary ring-primary/30 shadow-md ring-2"
                    : "border-border hover:border-primary/40 hover:shadow-xs",
                )}
              >
                {/* Mini vista previa real usando CSS custom properties del tema */}
                <div
                  data-theme={preset.id}
                  data-mode={config.mode}
                  className="border-border bg-background text-foreground w-full border-b p-3.5"
                >
                  <div className="border-border bg-surface flex items-center justify-between gap-2 rounded-2xl border px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="bg-primary h-3.5 w-3.5 rounded-full" />
                      <span className="bg-foreground/75 h-2.5 w-14 rounded-full" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="bg-secondary h-3 w-3 rounded-full" />
                      <span className="bg-accent h-3 w-3 rounded-full" />
                    </div>
                  </div>
                  <div className="mt-2.5 grid grid-cols-3 gap-1.5">
                    <div className="border-border bg-card rounded-xl border p-2">
                      <span className="bg-muted-foreground/40 block h-2 w-5 rounded-full" />
                      <span className="bg-cat-1-soft ring-cat-1/40 mt-1.5 block h-2.5 w-full rounded-md ring-1" />
                    </div>
                    <div className="border-primary/50 bg-primary-soft rounded-xl border p-2">
                      <span className="bg-primary block h-2 w-5 rounded-full" />
                      <span className="bg-cat-2-soft ring-cat-2/40 mt-1.5 block h-2.5 w-full rounded-md ring-1" />
                    </div>
                    <div className="border-border bg-card rounded-xl border p-2">
                      <span className="bg-muted-foreground/40 block h-2 w-5 rounded-full" />
                      <span className="bg-cat-3-soft ring-cat-3/40 mt-1.5 block h-2.5 w-full rounded-md ring-1" />
                    </div>
                  </div>
                </div>

                {/* Descripción */}
                <div className="bg-card flex flex-1 flex-col justify-between p-4">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-foreground text-sm font-extrabold">
                        {preset.name}
                      </h3>
                      {active && (
                        <span className="bg-primary text-primary-foreground inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase">
                          <Check className="h-3 w-3" />
                          Activa
                        </span>
                      )}
                    </div>
                    <p className="text-primary mt-0.5 text-[11px] font-semibold">
                      {preset.tagline}
                    </p>
                    <p className="text-muted-foreground mt-1.5 text-xs">
                      {preset.description}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Densidad visual (Dragon Touch Wall Mode) */}
      <section className="border-border bg-card rounded-3xl border p-5 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="bg-secondary-soft text-secondary flex h-10 w-10 items-center justify-center rounded-2xl">
            <Monitor className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-foreground text-base font-extrabold">
              Escala de pantalla
            </h2>
            <p className="text-muted-foreground text-xs">
              Ajusta el tamaño de lectura para escritorio o pantalla inteligente
              de pared (21.5&quot;)
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {DENSITY_OPTIONS.map((opt) => {
            const active = config.density === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setDensity(opt.id)}
                className={cn(
                  "cursor-pointer rounded-2xl border p-4 text-left transition-all",
                  active
                    ? "border-primary bg-primary-soft/50 ring-primary/25 ring-2"
                    : "border-border bg-background hover:bg-card-hover",
                )}
              >
                <div className="flex items-center justify-between">
                  <p className="text-foreground text-sm font-bold">
                    {opt.label}
                  </p>
                  {active && (
                    <span className="bg-primary text-primary-foreground flex h-5 w-5 items-center justify-center rounded-full">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                  )}
                </div>
                <p className="text-muted-foreground mt-1 text-xs">
                  {opt.description}
                </p>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
