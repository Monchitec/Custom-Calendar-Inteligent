import type {
  CalendarColorSlot,
  DisplayDensity,
  ProfileColorSlot,
  ThemeConfig,
  ThemePresetMeta,
} from "@/types/theme";

export const DEFAULT_THEME_CONFIG: ThemeConfig = {
  preset: "ocean",
  mode: "light",
  density: "comfortable",
};

export const THEME_PRESETS: ThemePresetMeta[] = [
  {
    id: "rose",
    name: "Rosado Armónico",
    tagline: "Rosa, Salvia y Durazno",
    description:
      "Tonos rosados suaves y elegantes equilibrados con acentos salvia y durazno para lectura cómoda todo el día.",
  },
  {
    id: "sage",
    name: "Salvia Botánica",
    tagline: "Verde salvia, Terracota y Arena",
    description:
      "Paleta orgánica y tranquila inspirada en elementos botánicos, ideal para pantallas de hogar.",
  },
  {
    id: "ocean",
    name: "Océano Sereno",
    tagline: "Por defecto · Azul océano, Turquesa y Coral",
    description:
      "Fresco, nítido y de alto enfoque con complementarios cálidos en coral.",
  },
  {
    id: "lavender",
    name: "Lavanda Suave",
    tagline: "Lavanda, Menta y Miel",
    description:
      "Atmósfera moderna y creativa con toques suaves en menta y miel dorada.",
  },
  {
    id: "sunset",
    name: "Atardecer Cálido",
    tagline: "Terracota, Petróleo y Rosa",
    description:
      "Energía cálida y acogedora pensada para espacios familiares iluminados.",
  },
  {
    id: "minimal",
    name: "Grafito Minimal",
    tagline: "Grafito neutro, Índigo y Esmeralda",
    description:
      "Estética limpia y sobria donde los colores de cada perfil destacan al instante.",
  },
];

export const DENSITY_OPTIONS: Array<{
  id: DisplayDensity;
  label: string;
  description: string;
}> = [
  {
    id: "compact",
    label: "Compacto",
    description: "Más eventos visibles en pantallas de escritorio.",
  },
  {
    id: "comfortable",
    label: "Equilibrado",
    description: "Balance ideal para laptop, monitor o tablet.",
  },
  {
    id: "wall",
    label: 'Pantalla 21.5"',
    description: "Texto y botones amplios tipo Dragon Touch de pared.",
  },
];

export const CUSTOM_COLOR_SLOTS: Array<{
  slot: ProfileColorSlot;
  label: string;
}> = [
  { slot: "cat-1", label: "Acento 1" },
  { slot: "cat-2", label: "Acento 2" },
  { slot: "cat-3", label: "Acento 3" },
  { slot: "cat-4", label: "Acento 4" },
  { slot: "cat-5", label: "Acento 5" },
  { slot: "cat-6", label: "Acento 6" },
  { slot: "cat-7", label: "Acento 7" },
];

export interface ProfileSlotClassSet {
  pill: string;
  block: string;
  dot: string;
  badge: string;
  borderLeft: string;
  borderTop: string;
  topBarCard: string;
  iconBg: string;
  activeChip: string;
}

export const PROFILE_SLOT_CLASSES: Record<
  CalendarColorSlot,
  ProfileSlotClassSet
> = {
  "cat-bills": {
    pill: "bg-cat-bills-soft text-cat-bills border-cat-bills",
    block: "bg-cat-bills-soft/90 border-l-cat-bills text-foreground",
    dot: "bg-cat-bills",
    badge: "bg-cat-bills-soft text-cat-bills border border-cat-bills/30",
    borderLeft: "border-l-cat-bills",
    borderTop: "border-t-cat-bills",
    topBarCard: "bg-cat-bills-soft/70 border-t-cat-bills text-foreground",
    iconBg: "bg-cat-bills-soft text-cat-bills",
    activeChip: "bg-cat-bills-soft text-cat-bills border-cat-bills/40",
  },
  "cat-1": {
    pill: "bg-cat-1-soft text-cat-1 border-cat-1",
    block: "bg-cat-1-soft/90 border-l-cat-1 text-foreground",
    dot: "bg-cat-1",
    badge: "bg-cat-1-soft text-cat-1 border border-cat-1/30",
    borderLeft: "border-l-cat-1",
    borderTop: "border-t-cat-1",
    topBarCard: "bg-cat-1-soft/70 border-t-cat-1 text-foreground",
    iconBg: "bg-cat-1-soft text-cat-1",
    activeChip: "bg-cat-1-soft text-cat-1 border-cat-1/40",
  },
  "cat-2": {
    pill: "bg-cat-2-soft text-cat-2 border-cat-2",
    block: "bg-cat-2-soft/90 border-l-cat-2 text-foreground",
    dot: "bg-cat-2",
    badge: "bg-cat-2-soft text-cat-2 border border-cat-2/30",
    borderLeft: "border-l-cat-2",
    borderTop: "border-t-cat-2",
    topBarCard: "bg-cat-2-soft/70 border-t-cat-2 text-foreground",
    iconBg: "bg-cat-2-soft text-cat-2",
    activeChip: "bg-cat-2-soft text-cat-2 border-cat-2/40",
  },
  "cat-3": {
    pill: "bg-cat-3-soft text-cat-3 border-cat-3",
    block: "bg-cat-3-soft/90 border-l-cat-3 text-foreground",
    dot: "bg-cat-3",
    badge: "bg-cat-3-soft text-cat-3 border border-cat-3/30",
    borderLeft: "border-l-cat-3",
    borderTop: "border-t-cat-3",
    topBarCard: "bg-cat-3-soft/70 border-t-cat-3 text-foreground",
    iconBg: "bg-cat-3-soft text-cat-3",
    activeChip: "bg-cat-3-soft text-cat-3 border-cat-3/40",
  },
  "cat-4": {
    pill: "bg-cat-4-soft text-cat-4 border-cat-4",
    block: "bg-cat-4-soft/90 border-l-cat-4 text-foreground",
    dot: "bg-cat-4",
    badge: "bg-cat-4-soft text-cat-4 border border-cat-4/30",
    borderLeft: "border-l-cat-4",
    borderTop: "border-t-cat-4",
    topBarCard: "bg-cat-4-soft/70 border-t-cat-4 text-foreground",
    iconBg: "bg-cat-4-soft text-cat-4",
    activeChip: "bg-cat-4-soft text-cat-4 border-cat-4/40",
  },
  "cat-5": {
    pill: "bg-cat-5-soft text-cat-5 border-cat-5",
    block: "bg-cat-5-soft/90 border-l-cat-5 text-foreground",
    dot: "bg-cat-5",
    badge: "bg-cat-5-soft text-cat-5 border border-cat-5/30",
    borderLeft: "border-l-cat-5",
    borderTop: "border-t-cat-5",
    topBarCard: "bg-cat-5-soft/70 border-t-cat-5 text-foreground",
    iconBg: "bg-cat-5-soft text-cat-5",
    activeChip: "bg-cat-5-soft text-cat-5 border-cat-5/40",
  },
  "cat-6": {
    pill: "bg-cat-6-soft text-cat-6 border-cat-6",
    block: "bg-cat-6-soft/90 border-l-cat-6 text-foreground",
    dot: "bg-cat-6",
    badge: "bg-cat-6-soft text-cat-6 border border-cat-6/30",
    borderLeft: "border-l-cat-6",
    borderTop: "border-t-cat-6",
    topBarCard: "bg-cat-6-soft/70 border-t-cat-6 text-foreground",
    iconBg: "bg-cat-6-soft text-cat-6",
    activeChip: "bg-cat-6-soft text-cat-6 border-cat-6/40",
  },
  "cat-7": {
    pill: "bg-cat-7-soft text-cat-7 border-cat-7",
    block: "bg-cat-7-soft/90 border-l-cat-7 text-foreground",
    dot: "bg-cat-7",
    badge: "bg-cat-7-soft text-cat-7 border border-cat-7/30",
    borderLeft: "border-l-cat-7",
    borderTop: "border-t-cat-7",
    topBarCard: "bg-cat-7-soft/70 border-t-cat-7 text-foreground",
    iconBg: "bg-cat-7-soft text-cat-7",
    activeChip: "bg-cat-7-soft text-cat-7 border-cat-7/40",
  },
};

export function getProfileSlotClasses(
  slot: CalendarColorSlot,
): ProfileSlotClassSet {
  return PROFILE_SLOT_CLASSES[slot] ?? PROFILE_SLOT_CLASSES["cat-1"];
}
