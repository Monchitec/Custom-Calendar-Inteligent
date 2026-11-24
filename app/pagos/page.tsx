import type { Metadata } from "next";
import { BillsDashboard } from "@/components/bills/BillsDashboard";

export const metadata: Metadata = {
  title: "Pagos del Hogar · Mi Calendario Personal",
  description:
    "Gestión de pagos recurrentes de vivienda, servicios y colegiatura con alertas y proyección en calendario.",
};

export default function PagosPage() {
  return <BillsDashboard />;
}
