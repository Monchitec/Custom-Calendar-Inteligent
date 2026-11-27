"use client";

import { useState } from "react";
import {
  AlarmClock,
  Bell,
  Mail,
  Play,
  Plus,
  RotateCcw,
  Send,
  Trash2,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useCalendarData } from "@/components/shared/providers/CalendarDataProvider";
import { Button } from "@/components/shared/ui/Button";
import { ProfileIcon } from "@/components/shared/ui/ProfileIcon";
import { Switch } from "@/components/shared/ui/Switch";
import { cn } from "@/lib/cn";
import { formatTimeDisplay, getWeekdayTinyLabels } from "@/lib/dates";
import { ALARM_SOUNDS, playAlarmSound } from "@/lib/sounds";
import { getProfileSlotClasses } from "@/lib/themes";
import type { AlarmSoundId } from "@/types/alarms";
import type { Profile } from "@/types/calendar";

const INPUT_CLASS =
  "w-full rounded-xl bg-background border border-border px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/25";
const LABEL_CLASS =
  "block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5";

export function AlarmsSettingsPanel() {
  const {
    alarms,
    profiles,
    preferences,
    addAlarm,
    toggleAlarm,
    deleteAlarm,
    triggerAlarmTest,
    updatePreferences,
    updateProfile,
    resetDemoData,
  } = useCalendarData();

  const [label, setLabel] = useState("");
  const [time, setTime] = useState("07:30");
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [sound, setSound] = useState<AlarmSoundId>(preferences.defaultSound);
  const [snoozeMinutes, setSnoozeMinutes] = useState("5");
  const [notifStatus, setNotifStatus] = useState<string>("");
  const [testingEmailId, setTestingEmailId] = useState<string | null>(null);
  const [emailTestFeedback, setEmailTestFeedback] = useState<{
    id: string;
    ok: boolean;
    message: string;
  } | null>(null);

  const weekdayTiny = getWeekdayTinyLabels();

  const toggleDay = (idx: number) => {
    setDays((prev) =>
      prev.includes(idx)
        ? prev.filter((d) => d !== idx)
        : [...prev, idx].sort(),
    );
  };

  const handleAddAlarm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return;
    addAlarm({
      label: label.trim(),
      time,
      days,
      enabled: true,
      sound,
      profileId: profiles[0]?.id,
      snoozeMinutes: Math.max(1, Number(snoozeMinutes) || 5),
    });
    setLabel("");
  };

  const handleRequestBrowserNotifications = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setNotifStatus("Tu navegador no soporta notificaciones nativas.");
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
          subject: `Prueba de recordatorio · ${profile.name}`,
          eventTitle: "Correo de prueba de Mi Calendario",
          body: "Si ves este mensaje, los recordatorios por correo de tus eventos ya están funcionando correctamente.",
          profileName: profile.name,
          isTest: true,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setEmailTestFeedback({
          id: profile.id,
          ok: false,
          message: data.error ?? "No se pudo enviar el correo.",
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
        message: "Error de red al intentar enviar el correo.",
      });
    } finally {
      setTestingEmailId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Lista de Alarmas */}
        <section className="border-border bg-card rounded-3xl border p-5 shadow-xs lg:col-span-7">
          <div className="flex items-center gap-2.5">
            <div className="bg-primary-soft text-primary flex h-10 w-10 items-center justify-center rounded-2xl">
              <AlarmClock className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-foreground text-base font-extrabold">
                Alarmas programadas
              </h2>
              <p className="text-muted-foreground text-xs">
                Suenan con el tono elegido y muestran una alerta interactiva
                para posponer o detener
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {alarms.length === 0 ? (
              <p className="border-border text-muted-foreground rounded-2xl border border-dashed py-10 text-center text-sm">
                No tienes alarmas creadas todavía.
              </p>
            ) : (
              alarms.map((alarm) => {
                const soundMeta = ALARM_SOUNDS.find(
                  (s) => s.id === alarm.sound,
                );
                return (
                  <div
                    key={alarm.id}
                    className={cn(
                      "flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-4 transition-all",
                      alarm.enabled
                        ? "border-primary/30 bg-primary-soft/20"
                        : "border-border bg-surface/40 opacity-75",
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2.5">
                        <span className="text-foreground font-mono text-2xl font-extrabold tabular-nums">
                          {formatTimeDisplay(alarm.time)}
                        </span>
                        <span className="text-foreground truncate text-sm font-bold">
                          {alarm.label}
                        </span>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        {alarm.days.length === 0 ? (
                          <span className="bg-muted text-muted-foreground rounded-full px-2.5 py-0.5 text-[11px] font-semibold">
                            Una sola vez
                          </span>
                        ) : (
                          weekdayTiny.map((d, idx) => (
                            <span
                              key={d + idx}
                              className={cn(
                                "flex h-6 w-6 items-center justify-center rounded-lg text-[10px] font-bold",
                                alarm.days.includes(idx)
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted text-muted-foreground/60",
                              )}
                            >
                              {d}
                            </span>
                          ))
                        )}
                        <span className="bg-card text-muted-foreground ml-1 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium">
                          <Volume2 className="text-primary h-3 w-3" />
                          {soundMeta?.name ?? alarm.sound}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="soft"
                        size="sm"
                        onClick={() => triggerAlarmTest(alarm)}
                        title="Simular y escuchar esta alarma"
                      >
                        <Play className="h-3.5 w-3.5" />
                        Probar
                      </Button>
                      <Switch
                        checked={alarm.enabled}
                        onChange={() => toggleAlarm(alarm.id)}
                        ariaLabel={`Activar o desactivar alarma ${alarm.label}`}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteAlarm(alarm.id)}
                        aria-label={`Eliminar alarma ${alarm.label}`}
                        className="hover:text-danger h-9 w-9"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Formulario nueva alarma */}
        <section className="border-border bg-card rounded-3xl border p-5 shadow-xs lg:col-span-5">
          <h2 className="text-foreground text-base font-extrabold">
            Nueva alarma
          </h2>
          <p className="text-muted-foreground mt-0.5 text-xs">
            Programa despertadores, salidas escolares, medicación o pausas
          </p>

          <form onSubmit={handleAddAlarm} className="mt-4 space-y-4">
            <div>
              <label htmlFor="cfg-alm-label" className={LABEL_CLASS}>
                Etiqueta
              </label>
              <input
                id="cfg-alm-label"
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Ej. Recoger a Azucena, Tomar agua..."
                className={INPUT_CLASS}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="cfg-alm-time" className={LABEL_CLASS}>
                  Hora
                </label>
                <input
                  id="cfg-alm-time"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className={cn(INPUT_CLASS, "font-bold tabular-nums")}
                />
              </div>
              <div>
                <label htmlFor="cfg-alm-snooze" className={LABEL_CLASS}>
                  Posponer (min)
                </label>
                <input
                  id="cfg-alm-snooze"
                  type="number"
                  min="1"
                  max="30"
                  value={snoozeMinutes}
                  onChange={(e) => setSnoozeMinutes(e.target.value)}
                  className={cn(INPUT_CLASS, "tabular-nums")}
                />
              </div>
            </div>

            <div>
              <span className={LABEL_CLASS}>Repetir</span>
              <div className="flex flex-wrap gap-1.5">
                {weekdayTiny.map((d, idx) => {
                  const selected = days.includes(idx);
                  return (
                    <button
                      key={d + idx}
                      type="button"
                      onClick={() => toggleDay(idx)}
                      className={cn(
                        "flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl text-xs font-bold transition-all",
                        selected
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "border-border bg-background text-muted-foreground hover:bg-muted border",
                      )}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label htmlFor="cfg-alm-sound" className={LABEL_CLASS}>
                Tono
              </label>
              <div className="flex gap-2">
                <select
                  id="cfg-alm-sound"
                  value={sound}
                  onChange={(e) => setSound(e.target.value as AlarmSoundId)}
                  className={INPUT_CLASS}
                >
                  {ALARM_SOUNDS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={() => playAlarmSound(sound, preferences.volume)}
                  aria-label="Escuchar tono"
                >
                  <Volume2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Button type="submit" variant="primary" className="w-full">
              <Plus className="h-4 w-4" />
              Agregar alarma
            </Button>
          </form>
        </section>
      </div>

      {/* Sonidos, Recordatorios por defecto y Notificaciones */}
      <section className="border-border bg-card rounded-3xl border p-5 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="bg-secondary-soft text-secondary flex h-10 w-10 items-center justify-center rounded-2xl">
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-foreground text-base font-extrabold">
              Notificaciones
            </h2>
            <p className="text-muted-foreground text-xs">
              Define sonidos, anticipación de recordatorios y envíos por correo
              para cada perfil
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="border-border bg-surface/50 space-y-4 rounded-2xl border p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {preferences.soundEnabled ? (
                  <Volume2 className="text-primary h-5 w-5" />
                ) : (
                  <VolumeX className="text-muted-foreground h-5 w-5" />
                )}
                <div>
                  <p className="text-foreground text-sm font-bold">
                    Sonido de alarmas
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Reproducir melodía al dispararse una alarma
                  </p>
                </div>
              </div>
              <Switch
                checked={preferences.soundEnabled}
                onChange={(v) => updatePreferences({ soundEnabled: v })}
                ariaLabel="Activar o silenciar sonido de alarmas"
              />
            </div>

            <div>
              <div className="text-muted-foreground mb-1.5 flex items-center justify-between text-xs font-semibold">
                <span>Volumen</span>
                <span className="text-foreground font-bold tabular-nums">
                  {Math.round(preferences.volume * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.05"
                value={preferences.volume}
                onChange={(e) =>
                  updatePreferences({ volume: Number(e.target.value) })
                }
                aria-label="Volumen de alarmas"
                className="accent-primary w-full"
              />
            </div>

            <div>
              <span className={LABEL_CLASS}>
                Catálogo de tonos (clic para probar)
              </span>
              <div className="grid grid-cols-2 gap-2">
                {ALARM_SOUNDS.map((s) => {
                  const isDefault = preferences.defaultSound === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        updatePreferences({ defaultSound: s.id });
                        playAlarmSound(s.id, preferences.volume);
                      }}
                      className={cn(
                        "cursor-pointer rounded-xl border px-3 py-2 text-left text-xs transition-all",
                        isDefault
                          ? "border-primary bg-primary-soft text-primary font-bold"
                          : "border-border bg-card text-foreground hover:bg-card-hover",
                      )}
                    >
                      <p className="truncate font-bold">{s.name}</p>
                      <p className="mt-0.5 truncate text-[10px] opacity-80">
                        {s.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

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

            <div className="border-border bg-card rounded-2xl border p-3.5">
              <p className="text-foreground text-sm font-bold">
                Notificaciones del navegador
              </p>
              <p className="text-muted-foreground mt-0.5 text-xs">
                Recibe avisos de escritorio cuando suene una alarma aunque estés
                en otra pestaña.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button
                  variant="soft"
                  size="sm"
                  onClick={handleRequestBrowserNotifications}
                >
                  <Bell className="h-4 w-4" />
                  Activar notificaciones
                </Button>
                {notifStatus && (
                  <span className="text-primary text-xs font-semibold">
                    {notifStatus}
                  </span>
                )}
              </div>
            </div>

            <div className="border-border bg-card flex items-center justify-between rounded-2xl border p-3.5">
              <div>
                <p className="text-foreground text-xs font-bold">
                  Restaurar datos de ejemplo
                </p>
                <p className="text-muted-foreground text-[11px]">
                  Reinicia eventos, pagos y rutinas iniciales
                </p>
              </div>
              <Button variant="secondary" size="sm" onClick={resetDemoData}>
                <RotateCcw className="h-3.5 w-3.5" />
                Restaurar
              </Button>
            </div>
          </div>
        </div>

        {/* Notificaciones por correo por perfil */}
        <div className="border-border bg-surface/50 mt-4 rounded-2xl border p-4">
          <div className="flex items-center gap-2.5">
            <span className="bg-primary-soft text-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-xl">
              <Mail className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-foreground text-sm font-extrabold">
                Notificaciones por correo
              </h3>
              <p className="text-muted-foreground text-xs">
                Activa el envío de recordatorios de eventos al correo de cada
                perfil
              </p>
            </div>
          </div>

          <div className="mt-3 divide-y divide-border">
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
        </div>
      </section>
    </div>
  );
}
