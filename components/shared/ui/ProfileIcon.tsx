import {
  Briefcase,
  Car,
  CheckSquare,
  Dumbbell,
  GraduationCap,
  Heart,
  Home,
  Music,
  Sparkles,
  Star,
  Stethoscope,
  Utensils,
} from "lucide-react";
import type { ProfileIconName } from "@/types/calendar";

export const PROFILE_ICON_OPTIONS: Array<{
  id: ProfileIconName;
  label: string;
}> = [
  { id: "briefcase", label: "Trabajo" },
  { id: "graduation-cap", label: "Colegio" },
  { id: "stethoscope", label: "Salud / Citas" },
  { id: "sparkles", label: "Actividades" },
  { id: "home", label: "Hogar" },
  { id: "heart", label: "Familia / Personal" },
  { id: "check-square", label: "Tareas" },
  { id: "star", label: "Favorito" },
  { id: "dumbbell", label: "Ejercicio" },
  { id: "car", label: "Salidas / Viajes" },
  { id: "utensils", label: "Comidas" },
  { id: "music", label: "Música / Arte" },
];

export function ProfileIcon({
  name,
  className = "h-4 w-4",
}: {
  name: ProfileIconName;
  className?: string;
}) {
  switch (name) {
    case "briefcase":
      return <Briefcase className={className} aria-hidden="true" />;
    case "graduation-cap":
      return <GraduationCap className={className} aria-hidden="true" />;
    case "stethoscope":
      return <Stethoscope className={className} aria-hidden="true" />;
    case "sparkles":
      return <Sparkles className={className} aria-hidden="true" />;
    case "home":
      return <Home className={className} aria-hidden="true" />;
    case "check-square":
      return <CheckSquare className={className} aria-hidden="true" />;
    case "heart":
      return <Heart className={className} aria-hidden="true" />;
    case "star":
      return <Star className={className} aria-hidden="true" />;
    case "dumbbell":
      return <Dumbbell className={className} aria-hidden="true" />;
    case "car":
      return <Car className={className} aria-hidden="true" />;
    case "utensils":
      return <Utensils className={className} aria-hidden="true" />;
    case "music":
      return <Music className={className} aria-hidden="true" />;
    default:
      return <Sparkles className={className} aria-hidden="true" />;
  }
}
