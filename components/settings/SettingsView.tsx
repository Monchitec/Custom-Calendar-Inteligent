"use client";

import { useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Bell, Download, Palette, Upload, Users } from "lucide-react";
import { useCalendarData } from "@/components/shared/providers/CalendarDataProvider";
import { Button } from "@/components/shared/ui/Button";
import { cn } from "@/lib/cn";
import { buildIcsCalendar, parseIcsEvents } from "@/lib/ics";
import { NotificationsSettingsPanel } from "./NotificationsSettingsPanel";
import { ProfileCustomizer } from "./ProfileCustomizer";
import { ThemeSelector } from "./ThemeSelector";

type SettingsTab = "perfiles" | "apariencia" | "notificaciones";

const TABS: Array<{
  id: SettingsTab;
  label: string;
  icon: typeof Palette;
}> = [
  { id: "perfiles", label: "Perfiles", icon: Users },
  { id: "apariencia", label: "Apariencia y Temas", icon: Palette },
  { id: "notificaciones", label: "Notificaciones", icon: Bell },
];

export function SettingsView() {
  const searchParams = useSearchParams();
  const initialParam = searchParams.get("tab");
  const initialTab: SettingsTab =
    initialParam === "apariencia"
      ? "apariencia"
      : initialParam === "notificaciones"
        ? "notificaciones"
        : "perfiles";

  const [tab, setTab] = useState<SettingsTab>(initialTab);
  const { events, profiles, addEvent } = useCalendarData();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [icsFeedback, setIcsFeedback] = useState<string>("");

  const handleExportIcs = () => {
    const content = buildIcsCalendar(
      events.map((ev) => ({
        id: ev.id,
        title: ev.title,
        date: ev.date,
        allDay: ev.allDay,
        startTime: ev.startTime,
        endTime: ev.endTime,
        location: ev.location,
        notes: ev.notes,
      })),
    );
    const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mi-calendario.ics";
    a.click();
    URL.revokeObjectURL(url);
    setIcsFeedback(`Exportados ${events.length} eventos a mi-calendario.ics.`);
  };

  const handleImportIcs = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const text = await file.text();
    const parsed = parseIcsEvents(text);
    if (parsed.length === 0) {
      setIcsFeedback("No se encontraron eventos válidos en el archivo .ics.");
      return;
    }
    const defaultProfileId = profiles[0]?.id ?? "p-rubitch";
    for (const ev of parsed) {
      addEvent({ ...ev, profileId: defaultProfileId });
    }
    setIcsFeedback(`Importados ${parsed.length} eventos correctamente.`);
  };

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
      {tab === "notificaciones" && <NotificationsSettingsPanel />}

      {/* Respaldo e importación .ics */}
      <section className="border-border bg-card rounded-3xl border p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-foreground text-base font-extrabold">
              Respaldo e importación (.ics)
            </h2>
            <p className="text-muted-foreground mt-0.5 text-xs">
              Exporta tus eventos a formato universal (.ics) o importa eventos
              desde Google Calendar, Outlook o Apple Calendar
            </p>
            {icsFeedback && (
              <p className="text-primary mt-1.5 text-xs font-semibold">
                {icsFeedback}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".ics,text/calendar"
              onChange={(e) => void handleImportIcs(e)}
              className="hidden"
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4" />
              Importar .ics
            </Button>
            <Button
              type="button"
              variant="soft"
              size="sm"
              onClick={handleExportIcs}
            >
              <Download className="h-4 w-4" />
              Exportar .ics
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
