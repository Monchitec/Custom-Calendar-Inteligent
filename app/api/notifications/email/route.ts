import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

interface EmailPayload {
  to: string;
  subject: string;
  eventTitle: string;
  body: string;
  profileName?: string;
  location?: string;
  isTest?: boolean;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildReminderHtml({
  eventTitle,
  body,
  profileName,
  location,
  isTest,
}: Omit<EmailPayload, "to" | "subject">): string {
  const safeTitle = escapeHtml(eventTitle);
  const safeBody = escapeHtml(body);
  const safeProfile = profileName ? escapeHtml(profileName) : "";
  const safeLocation = location ? escapeHtml(location) : "";

  return `<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  </head>
  <body style="margin:0;padding:0;background-color:#f5f7fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#142238;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:28px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background-color:#ffffff;border-radius:20px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 6px 24px rgba(15,23,42,0.06);">
            <tr>
              <td style="background:linear-gradient(135deg,#2563eb,#3b82f6);padding:20px 24px;color:#ffffff;">
                <div style="font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;opacity:0.9;">
                  ${isTest ? "Correo de prueba · Mi Calendario" : "Recordatorio de evento · Mi Calendario"}
                </div>
                <div style="margin-top:6px;font-size:20px;font-weight:800;line-height:1.3;">
                  ${safeTitle}
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:22px 24px;">
                <p style="margin:0 0 14px;font-size:15px;line-height:1.5;color:#1e293b;font-weight:600;">
                  ${safeBody}
                </p>
                ${
                  safeProfile || safeLocation
                    ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:12px 14px;margin-top:8px;">
                        ${
                          safeProfile
                            ? `<tr><td style="font-size:13px;color:#475569;padding:2px 0;"><strong style="color:#0f172a;">Perfil:</strong> ${safeProfile}</td></tr>`
                            : ""
                        }
                        ${
                          safeLocation
                            ? `<tr><td style="font-size:13px;color:#475569;padding:2px 0;"><strong style="color:#0f172a;">Ubicación:</strong> ${safeLocation}</td></tr>`
                            : ""
                        }
                      </table>`
                    : ""
                }
                <p style="margin:18px 0 0;font-size:12px;color:#64748b;line-height:1.5;">
                  Enviado automáticamente desde tu Calendario Personal Inteligente.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export async function POST(request: Request) {
  try {
    const smtpUser = process.env.SMTP_USER?.trim();
    const smtpPass = process.env.SMTP_PASS?.replace(/\s+/g, "");

    if (!smtpUser || !smtpPass) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Faltan SMTP_USER o SMTP_PASS en .env.local para enviar correos.",
        },
        { status: 500 },
      );
    }

    const payload = (await request.json()) as Partial<EmailPayload>;
    const to = payload.to?.trim();
    const subject = payload.subject?.trim();
    const eventTitle = payload.eventTitle?.trim();
    const body = payload.body?.trim();

    if (!to || !subject || !eventTitle || !body) {
      return NextResponse.json(
        { ok: false, error: "Datos incompletos para enviar el correo." },
        { status: 400 },
      );
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    await transporter.sendMail({
      from: `"Mi Calendario" <${smtpUser}>`,
      to,
      subject,
      text: `${eventTitle}\n${body}${payload.profileName ? `\nPerfil: ${payload.profileName}` : ""}${payload.location ? `\nUbicación: ${payload.location}` : ""}`,
      html: buildReminderHtml({
        eventTitle,
        body,
        profileName: payload.profileName,
        location: payload.location,
        isTest: payload.isTest,
      }),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Error desconocido al enviar correo";
    console.error("[Email Notification Error]", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
