"use client";

import { useState } from "react";
import { Bell, Mail, Send } from "lucide-react";
import { useCalendarData } from "@/components/shared/providers/CalendarDataProvider";
import { Button } from "@/components/shared/ui/Button";
import { ProfileIcon } from "@/components/shared/ui/ProfileIcon";
import { Switch } from "@/components/shared/ui/Switch";
import { cn } from "@/lib/cn";
import { getProfileSlotClasses } from "@/lib/themes";
import type { Profile } from "@/types/calendar";

const INPUT_CLASS =
  "w-full rounded-xl bg-background border border-border px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/25";
const LABEL_CLASS =
  "block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5";

export function NotificationsSettingsPanel() {
  const { profiles, preferences, updatePreferences, updateProfile } =
    useCalendarData();

  const [notifStatus, setNotifStatus] = useState<string>(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return "";
    if (window.Notification.permission === "granted") {
      return "Notificaciones del navegador activadas.";
    }
    if (window.Notification.permission === "denied") {
      return "Permiso denegado en el navegador.";
    }
    return "";
  });
  const [testingEmailId, setTestingEmailId] = useState<string | null>(null);
  const [emailTestFeedback, setEmailTestFeedback] = useState<{
    id: string;
    ok: boolean;
    message: string;
  } | null>(null);

  const handleToggleBrowserNotifications = async (nextEnabled: boolean) => {
    if (!nextEnabled) {
      updatePreferences({ browserNotificationsEnabled: false });
      setNotifStatus("Notificaciones del navegador desactivadas.");
      return;
    }

    if (typeof window === "undefined" || !("Notification" in window)) {
      setNotifStatus("Tu navegador no soporta notificaciones nativas.");
      return;
    }

    if (window.Notification.permission === "granted") {
      updatePreferences({ browserNotificationsEnabled: true });
      setNotifStatus("Notificaciones del navegador activadas.");
      return;
    }

    const perm = await window.Notification.requestPermission();
    if (perm === "granted") {
      updatePreferences({ browserNotificationsEnabled: true });
      setNotifStatus("Notificaciones del navegador activadas.");
      new window.Notification("Mi Calendario Personal", {
        body: "Las notificaciones y alarmas están listas.",
      });
    } else {
      updatePreferences({ browserNotificationsEnabled: false });
      setNotifStatus("Permiso denegado en el navegador.");
    }
  };

  const handleSendTestEmail = async (profile: Profile) => {
    if (!profile.email) return;
    setTestingEmailId(profile.id);
    setEmailTestFeedback(null);

    try {
      const res = await fetch("/api/notifications/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: profile.email,
          subject: "Recordatorio: Cita médica (10:00 a. m.)",
          eventTitle: "Cita médica",
          body: "En 15 min (10:00 a. m.)",
          profileName: profile.name,
          location: "Clínica Central",
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setEmailTestFeedback({
          id: profile.id,
          ok: false,
          message: data.error || "No se pudo enviar el correo.",
        });
      } else {
        setEmailTestFeedback({
          id: profile.id,
          ok: true,
          message: `Enviado a ${profile.email}`,
        });
      }
    } catch {
      setEmailTestFeedback({
        id: profile.id,
        ok: false,
        message: "Error de conexión al enviar.",
      });
    } finally {
      setTestingEmailId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Recordatorios y notificaciones del navegador */}
      <section className="border-border bg-card rounded-3xl border p-5 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="bg-primary-soft text-primary flex h-10 w-10 items-center justify-center rounded-2xl">
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-foreground text-base font-extrabold">
              Recordatorios y notificaciones
            </h2>
            <p className="text-muted-foreground text-xs">
              Configura la anticipación de avisos, alertas del navegador y
              envíos por correo
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="border-border bg-surface/50 space-y-4 rounded-2xl border p-4">
            <div>
              <label htmlFor="pref-evt-lead" className={LABEL_CLASS}>
                Recordatorio por defecto en citas y eventos
              </label>
              <select
                id="pref-evt-lead"
                value={preferences.defaultEventLeadMinutes}
                onChange={(e) =>
                  updatePreferences({
                    defaultEventLeadMinutes: Number(e.target.value),
                  })
                }
                className={INPUT_CLASS}
              >
                <option value={5}>5 minutos antes</option>
                <option value={10}>10 minutos antes</option>
                <option value={15}>15 minutos antes</option>
                <option value={30}>30 minutos antes</option>
                <option value={60}>1 hora antes</option>
              </select>
            </div>

            <div>
              <label htmlFor="pref-bill-lead" className={LABEL_CLASS}>
                Aviso anticipado para pagos del hogar
              </label>
              <select
                id="pref-bill-lead"
                value={preferences.defaultBillLeadDays}
                onChange={(e) =>
                  updatePreferences({
                    defaultBillLeadDays: Number(e.target.value),
                  })
                }
                className={INPUT_CLASS}
              >
                <option value={1}>1 día antes</option>
                <option value={2}>2 días antes</option>
                <option value={3}>3 días antes</option>
                <option value={5}>5 días antes</option>
                <option value={7}>7 días antes</option>
              </select>
            </div>
          </div>

          <div className="border-border bg-surface/50 flex flex-col justify-between rounded-2xl border p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-foreground text-sm font-bold">
                  Notificaciones del navegador
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  Recibe avisos de escritorio cuando llegue un recordatorio o
                  suene una alarma aunque estés en otra pestaña.
                </p>
              </div>
              <Switch
                checked={preferences.browserNotificationsEnabled}
                onChange={(checked) =>
                  void handleToggleBrowserNotifications(checked)
                }
                ariaLabel="Activar o desactivar notificaciones del navegador"
              />
            </div>
            {notifStatus && (
              <p className="text-primary mt-3 text-xs font-semibold">
                {notifStatus}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Notificaciones por correo por perfil */}
      <section className="border-border bg-card rounded-3xl border p-5 shadow-xs">
        <div className="flex items-center gap-3">
          <span className="bg-primary-soft text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl">
            <Mail className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-foreground text-base font-extrabold">
              Notificaciones por correo
            </h2>
            <p className="text-muted-foreground text-xs">
              Activa el envío de recordatorios de eventos al correo de cada
              perfil
            </p>
          </div>
        </div>

        <div className="mt-4 divide-y divide-border">
          {profiles.map((profile) => {
            const slot = getProfileSlotClasses(profile.colorSlot);
            const hasEmail = Boolean(profile.email?.trim());
            const isTesting = testingEmailId === profile.id;
            const feedback =
              emailTestFeedback?.id === profile.id ? emailTestFeedback : null;

            return (
              <div
                key={profile.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-1 last:pb-0"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <span
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full",
                      slot.iconBg,
                    )}
                  >
                    {profile.customImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={profile.customImage}
                        alt={profile.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <ProfileIcon name={profile.icon} className="h-4 w-4" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="text-foreground truncate text-sm font-bold">
                      {profile.name}
                    </p>
                    <p className="text-muted-foreground truncate text-xs">
                      {hasEmail
                        ? profile.email
                        : "Agrega un correo en la pestaña Perfiles"}
                    </p>
                    {feedback && (
                      <p
                        className={cn(
                          "mt-0.5 text-[11px] font-semibold",
                          feedback.ok ? "text-success" : "text-danger",
                        )}
                      >
                        {feedback.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {hasEmail && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={isTesting}
                      onClick={() => void handleSendTestEmail(profile)}
                      className="h-8 px-2.5 text-xs"
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span>{isTesting ? "Enviando..." : "Probar"}</span>
                    </Button>
                  )}
                  <Switch
                    checked={hasEmail && Boolean(profile.emailNotifications)}
                    disabled={!hasEmail}
                    onChange={(checked) =>
                      updateProfile(profile.id, {
                        emailNotifications: checked,
                      })
                    }
                    ariaLabel={`Enviar recordatorios por correo a ${profile.name}`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
