export interface VisualIconOption {
  emoji: string;
  label: string;
  group: "hogar" | "trabajo" | "colegio" | "pagos" | "salud" | "actividades";
}

export const VISUAL_ICON_OPTIONS: VisualIconOption[] = [
  // Colegio & Rutinas
  { emoji: "🎒", label: "Mochila / Colegio", group: "colegio" },
  { emoji: "🎨", label: "Arte / Taller", group: "colegio" },
  { emoji: "📚", label: "Estudio / Tareas", group: "colegio" },
  { emoji: "🔬", label: "Proyecto / Ciencias", group: "colegio" },
  { emoji: "🥪", label: "Lonchera", group: "colegio" },
  { emoji: "✏️", label: "Útiles / Cuaderno", group: "colegio" },
  // Trabajo
  { emoji: "💻", label: "Reunión / Trabajo", group: "trabajo" },
  { emoji: "📊", label: "Reporte / Entrega", group: "trabajo" },
  { emoji: "🎯", label: "Enfoque profundo", group: "trabajo" },
  { emoji: "📧", label: "Correos / Mensajes", group: "trabajo" },
  { emoji: "📞", label: "Llamada", group: "trabajo" },
  // Pagos del hogar
  { emoji: "🏠", label: "Alquiler / Casa", group: "pagos" },
  { emoji: "💡", label: "Electricidad / Luz", group: "pagos" },
  { emoji: "💧", label: "Agua", group: "pagos" },
  { emoji: "📶", label: "Internet / Fibra", group: "pagos" },
  { emoji: "🎓", label: "Mensualidad Colegio", group: "pagos" },
  { emoji: "📺", label: "Streaming / TV", group: "pagos" },
  { emoji: "💳", label: "Pago / Tarjeta", group: "pagos" },
  // Hogar y Tareas repetitivas
  { emoji: "🍳", label: "Desayuno / Cocina", group: "hogar" },
  { emoji: "👕", label: "Ropa / Uniforme", group: "hogar" },
  { emoji: "🧺", label: "Lavar ropa", group: "hogar" },
  { emoji: "🧹", label: "Limpieza / Orden", group: "hogar" },
  { emoji: "🛏️", label: "Sábanas / Dormitorio", group: "hogar" },
  { emoji: "🛒", label: "Compras / Mercado", group: "hogar" },
  { emoji: "🪴", label: "Plantas / Reciclaje", group: "hogar" },
  { emoji: "🔧", label: "Mantenimiento", group: "hogar" },
  // Salud y Citas
  { emoji: "🦷", label: "Dentista", group: "salud" },
  { emoji: "🩺", label: "Cita médica", group: "salud" },
  { emoji: "💊", label: "Medicación", group: "salud" },
  // Actividades
  { emoji: "🧘", label: "Pilates / Yoga", group: "actividades" },
  { emoji: "🎬", label: "Películas / Familia", group: "actividades" },
  { emoji: "🎉", label: "Celebración / Salida", group: "actividades" },
  { emoji: "🚗", label: "Traslado / Salida", group: "actividades" },
  { emoji: "⭐", label: "Prioridad / Importante", group: "actividades" },
];

export function inferVisualIcon(
  title: string,
  source: "event" | "bill" | "task",
  explicitIcon?: string,
): string {
  if (explicitIcon) return explicitIcon;

  // Regla visual unificada para identificación instantánea:
  // - Todos los pagos comparten el mismo ícono de pago (💳)
  // - Todas las tareas (rutinarias y no rutinarias) comparten el ícono de notas/checklist amarillo (📝)
  if (source === "bill") return "💳";
  if (source === "task") return "📝";

  const t = title.toLowerCase();
  if (t.includes("arte") || t.includes("dibujo") || t.includes("pint"))
    return "🎨";
  if (t.includes("maqueta") || t.includes("ciencia")) return "🔬";
  if (t.includes("colegio") || t.includes("mochila") || t.includes("escuela"))
    return "🎒";
  if (t.includes("filtro") || t.includes("mantenimiento")) return "🔧";
  if (t.includes("odonto") || t.includes("dental") || t.includes("diente"))
    return "🦷";
  if (t.includes("médic") || t.includes("cita") || t.includes("doctor"))
    return "🩺";
  if (t.includes("pilates") || t.includes("yoga") || t.includes("estira"))
    return "🧘";
  if (t.includes("película") || t.includes("pizza") || t.includes("cine"))
    return "🎬";
  if (t.includes("reunión") || t.includes("meet") || t.includes("equipo"))
    return "💻";
  if (t.includes("enfoque")) return "🎯";
  return "📅";
}
