import type { Metadata } from "next";
import { AlarmsSettingsPanel } from "@/components/settings/AlarmsSettingsPanel";
import { NotificationPopover } from "@/components/shared/layout/NotificationPopover";

export const metadata: Metadata = {
  title: "Alarmas · Mi Calendario Personal",
  description:
    "Programa alarmas con sonido, tonos personalizados, recordatorios y notificaciones del navegador.",
};

export default function AlarmasPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-foreground text-2xl font-extrabold tracking-tight sm:text-3xl">
            Alarmas y Notificaciones
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Programa despertadores, recordatorios con sonido y avisos del
            calendario
          </p>
        </div>
        <NotificationPopover />
      </div>

      <AlarmsSettingsPanel />
    </div>
  );
}
