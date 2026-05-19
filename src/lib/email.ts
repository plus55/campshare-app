import { Resend } from "resend";
import { getCloudflareContext } from "@opennextjs/cloudflare";

type CfEnv = { RESEND_API_KEY?: string; EMAIL_FROM?: string };

async function client(): Promise<Resend> {
  const { env } = await getCloudflareContext({ async: true });
  const cfEnv = env as unknown as CfEnv;
  const apiKey = cfEnv.RESEND_API_KEY ?? process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not set");
  return new Resend(apiKey);
}

async function fromAddress(): Promise<string> {
  const { env } = await getCloudflareContext({ async: true });
  const cfEnv = env as unknown as CfEnv;
  return cfEnv.EMAIL_FROM ?? process.env.EMAIL_FROM ?? "CampShare <hello@campshare.co.nz>";
}

interface BrandedEmail {
  to: string | string[];
  subject: string;
  heading: string;
  intro: string;
  cta?: { label: string; href: string };
  body?: string; // optional extra paragraph(s), HTML allowed
}

/**
 * Sends a transactional email using the CampShare brand template
 * (sand background, clay accent, Fraunces heading + Outfit body).
 */
export async function sendBrandedEmail(msg: BrandedEmail): Promise<void> {
  const [resend, from] = await Promise.all([client(), fromAddress()]);
  const html = renderTemplate(msg);

  await resend.emails.send({
    from,
    to: msg.to,
    subject: msg.subject,
    html,
  });
}

function renderTemplate({ heading, intro, cta, body }: BrandedEmail): string {
  const button = cta
    ? `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:32px 0;">
         <tr><td style="background:#b8624a;border-radius:8px;">
           <a href="${escapeHtml(cta.href)}"
              style="display:inline-block;padding:14px 28px;
                     font-family:'Outfit',sans-serif;font-size:16px;
                     color:#fff8ef;text-decoration:none;font-weight:500;">
             ${escapeHtml(cta.label)}
           </a>
         </td></tr>
       </table>`
    : "";

  return `<!doctype html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5ede0;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
         style="background:#f5ede0;padding:48px 16px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellspacing="0" cellpadding="0"
             style="background:#fff8ef;border-radius:16px;padding:48px;
                    font-family:'Outfit',-apple-system,system-ui,sans-serif;
                    color:#2b2118;line-height:1.55;">
        <tr><td>
          <p style="margin:0 0 24px;font-family:'Fraunces',Georgia,serif;
                    font-size:20px;color:#b8624a;letter-spacing:0.02em;">
            CampShare
          </p>
          <h1 style="margin:0 0 16px;font-family:'Fraunces',Georgia,serif;
                     font-size:28px;font-weight:500;color:#2b2118;">
            ${escapeHtml(heading)}
          </h1>
          <p style="margin:0;font-size:16px;color:#4a3f33;">
            ${escapeHtml(intro)}
          </p>
          ${button}
          ${body ? `<div style="margin-top:24px;font-size:14px;color:#6b5d4f;">${body}</div>` : ""}
          <hr style="border:none;border-top:1px solid #e7dcc8;margin:40px 0 20px;">
          <p style="margin:0;font-size:12px;color:#8a7b6a;">
            CampShare · Aotearoa New Zealand · app.campshare.co.nz
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
