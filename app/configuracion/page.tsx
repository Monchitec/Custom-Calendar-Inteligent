import { Suspense } from "react";
import type { Metadata } from "next";
import { SettingsView } from "@/components/settings/SettingsView";

export const metadata: Metadata = {
  title: "Configuración · Mi Calendario Personal",
  description:
    "Personaliza tus perfiles, temas de color, modo claro/oscuro, alarmas y notificaciones.",
};

export default function ConfiguracionPage() {
  return (
    <Suspense
      fallback={
        <div className="border-border bg-card text-muted-foreground rounded-3xl border p-8 text-sm">
          Cargando configuración...
        </div>
      }
    >
      <SettingsView />
    </Suspense>
  );
}
