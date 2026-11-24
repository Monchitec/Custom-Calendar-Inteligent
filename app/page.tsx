import type { Metadata } from "next";
import { CalendarBoard } from "@/components/calendar/CalendarBoard";

export const metadata: Metadata = {
  title: "Calendario · Mi Calendario Personal",
  description:
    "Vista unificada de calendario con eventos, citas, trabajo, colegio, tareas y pagos recurrentes.",
};

export default function HomePage() {
  return <CalendarBoard />;
}
