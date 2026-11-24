import type { Metadata } from "next";
import { Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { AppShell } from "@/components/shared/layout/AppShell";
import { CalendarDataProvider } from "@/components/shared/providers/CalendarDataProvider";
import { ThemeProvider } from "@/components/shared/providers/ThemeProvider";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mi Calendario · Centro Personal Inteligente",
  description:
    "Calendario personal interactivo con pagos recurrentes del hogar, trabajo, tareas, checklists, citas, alarmas y temas personalizables.",
};

const THEME_INIT_SCRIPT = `
(function(){
  try {
    var raw = localStorage.getItem('calendario_hub_theme_v1');
    if (raw) {
      var cfg = JSON.parse(raw);
      document.documentElement.dataset.theme = cfg.preset || 'rose';
      document.documentElement.dataset.mode = cfg.mode || 'light';
      document.documentElement.dataset.density = cfg.density || 'comfortable';
    } else {
      document.documentElement.dataset.theme = 'rose';
      document.documentElement.dataset.mode = 'light';
      document.documentElement.dataset.density = 'comfortable';
    }
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      data-theme="rose"
      data-mode="light"
      data-density="comfortable"
      suppressHydrationWarning
      className={`${plusJakarta.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="bg-background text-foreground min-h-full">
        <ThemeProvider>
          <CalendarDataProvider>
            <AppShell>{children}</AppShell>
          </CalendarDataProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
