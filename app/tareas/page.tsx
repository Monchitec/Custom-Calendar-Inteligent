import type { Metadata } from "next";
import { ChoreChecklistBoard } from "@/components/tasks/ChoreChecklistBoard";

export const metadata: Metadata = {
  title: "Mis Tareas · Mi Calendario Personal",
  description:
    "Mis Tareas: tablero interactivo de rutinas y lista de pendientes.",
};

export default function TareasPage() {
  return <ChoreChecklistBoard />;
}
