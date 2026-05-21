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

function fmtDate(ms: number): string {
  return new Date(ms).toLocaleDateString("en-NZ", {
    day: "numeric", month: "long", year: "numeric", timeZone: "Pacific/Auckland",
  });
}

function fmtDollars(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`;
}

const appUrl = () => process.env.BETTER_AUTH_URL ?? "https://app.campshare.co.nz";

export async function sendBookingRequestedEmail(opts: {
  hostEmail: string;
  hostFirstName: string;
  guestName: string;
  vanName: string;
  bookingId: string;
  startDate: number;
  endDate: number;
  nights: number;
  totalCents: number;
}): Promise<void> {
  await sendBrandedEmail({
    to: opts.hostEmail,
    subject: `New booking request for ${opts.vanName}`,
    heading: "You have a new booking request",
    intro: `Kia ora ${escapeHtml(opts.hostFirstName)}, ${escapeHtml(opts.guestName)} has requested to book ${escapeHtml(opts.vanName)}.`,
    cta: { label: "View request", href: `${appUrl()}/dashboard/bookings/${opts.bookingId}` },
    body: `<p>${fmtDate(opts.startDate)} → ${fmtDate(opts.endDate)} · ${opts.nights} night${opts.nights !== 1 ? "s" : ""} · ${fmtDollars(opts.totalCents)} total</p><p style="color:#6b5d4f;font-size:13px;">Respond within 48 hours or the request will expire.</p>`,
  });
}

export async function sendBookingAcceptedEmail(opts: {
  guestEmail: string;
  guestName: string;
  hostFirstName: string;
  vanName: string;
  bookingId: string;
  startDate: number;
  endDate: number;
  nights: number;
  totalCents: number;
}): Promise<void> {
  await sendBrandedEmail({
    to: opts.guestEmail,
    subject: `Your booking for ${opts.vanName} is confirmed`,
    heading: "Your booking is confirmed",
    intro: `Kia ora ${escapeHtml(opts.guestName)}, ${escapeHtml(opts.hostFirstName)} has accepted your request for ${escapeHtml(opts.vanName)}.`,
    cta: { label: "View booking", href: `${appUrl()}/trips/${opts.bookingId}` },
    body: `<p>${fmtDate(opts.startDate)} → ${fmtDate(opts.endDate)} · ${opts.nights} night${opts.nights !== 1 ? "s" : ""} · ${fmtDollars(opts.totalCents)} total</p>`,
  });
}

export async function sendPaymentCapturedEmail(opts: {
  guestEmail: string;
  guestName: string;
  hostFirstName: string;
  vanName: string;
  bookingId: string;
  startDate: number;
  endDate: number;
  nights: number;
  subtotalCents: number;
  serviceFeeCents: number;
  gstOnFeeCents: number;
  totalCents: number;
  depositCents: number;
}): Promise<void> {
  const breakdown = [
    `Van hire: ${fmtDollars(opts.subtotalCents)}`,
    `Service fee: ${fmtDollars(opts.serviceFeeCents)}`,
    `GST on fee: ${fmtDollars(opts.gstOnFeeCents)}`,
    `<strong>Total charged: ${fmtDollars(opts.totalCents)}</strong>`,
    `Security deposit authorised (not charged): ${fmtDollars(opts.depositCents)} — released after your trip`,
  ].join("<br>");

  await sendBrandedEmail({
    to: opts.guestEmail,
    subject: `Booking confirmed and payment received — ${opts.vanName}`,
    heading: "Booking confirmed — payment received",
    intro: `Kia ora ${escapeHtml(opts.guestName)}, ${escapeHtml(opts.hostFirstName)} has accepted your request for ${escapeHtml(opts.vanName)} and your payment has been processed.`,
    cta: { label: "View booking", href: `${appUrl()}/trips/${opts.bookingId}` },
    body: `<p>${fmtDate(opts.startDate)} → ${fmtDate(opts.endDate)} · ${opts.nights} night${opts.nights !== 1 ? "s" : ""}</p><p style="background:#f5ede0;border-radius:8px;padding:12px 16px;">${breakdown}</p>`,
  });
}

export async function sendBookingDeclinedEmail(opts: {
  guestEmail: string;
  guestName: string;
  vanName: string;
  bookingId: string;
  reason: string | null;
}): Promise<void> {
  await sendBrandedEmail({
    to: opts.guestEmail,
    subject: `Update on your booking request for ${opts.vanName}`,
    heading: "Booking request declined",
    intro: `Kia ora ${escapeHtml(opts.guestName)}, unfortunately your request for ${escapeHtml(opts.vanName)} wasn't available for those dates.`,
    cta: { label: "Find another van", href: `${appUrl()}/vans` },
    body: opts.reason ? `<p><strong>Host's note:</strong> ${escapeHtml(opts.reason)}</p>` : undefined,
  });
}

export async function sendBookingCancelledEmail(opts: {
  recipientEmail: string;
  recipientName: string;
  cancelledByRole: "guest" | "host";
  vanName: string;
  bookingId: string;
  startDate: number;
  endDate: number;
}): Promise<void> {
  const who = opts.cancelledByRole === "guest" ? "The guest" : "The host";
  await sendBrandedEmail({
    to: opts.recipientEmail,
    subject: `Booking for ${opts.vanName} cancelled`,
    heading: "Booking cancelled",
    intro: `Kia ora ${escapeHtml(opts.recipientName)}, ${who} has cancelled the booking for ${escapeHtml(opts.vanName)} (${fmtDate(opts.startDate)} → ${fmtDate(opts.endDate)}).`,
    cta: { label: "Browse vans", href: `${appUrl()}/vans` },
  });
}

export async function sendRefundProcessedEmail(opts: {
  guestEmail: string;
  guestName: string;
  vanName: string;
  bookingId: string;
  refundCents: number;
}): Promise<void> {
  await sendBrandedEmail({
    to: opts.guestEmail,
    subject: `Refund processed — ${opts.vanName}`,
    heading: "Your refund is on the way",
    intro: `Kia ora ${escapeHtml(opts.guestName)}, a refund of ${fmtDollars(opts.refundCents)} for your ${escapeHtml(opts.vanName)} booking has been initiated.`,
    cta: { label: "View booking", href: `${appUrl()}/trips/${opts.bookingId}` },
    body: `<p style="color:#6b5d4f;font-size:13px;">Refunds typically appear in 5–10 business days depending on your bank.</p>`,
  });
}

export async function sendDepositHoldEmail(opts: {
  guestEmail: string;
  guestName: string;
  vanName: string;
  bookingId: string;
  depositCents: number;
  endDate: number;
}): Promise<void> {
  await sendBrandedEmail({
    to: opts.guestEmail,
    subject: `Security deposit held — ${opts.vanName}`,
    heading: "Your trip has started — deposit held",
    intro: `Kia ora ${escapeHtml(opts.guestName)}, your ${escapeHtml(opts.vanName)} trip has started. A security deposit of ${fmtDollars(opts.depositCents)} has been authorised on your card (not charged).`,
    cta: { label: "View booking", href: `${appUrl()}/trips/${opts.bookingId}` },
    body: `<p style="color:#6b5d4f;font-size:13px;">The hold will be automatically released after your return on ${fmtDate(opts.endDate)} if no damage is reported.</p>`,
  });
}

export async function sendDepositReleasedEmail(opts: {
  guestEmail: string;
  guestName: string;
  vanName: string;
  bookingId: string;
}): Promise<void> {
  await sendBrandedEmail({
    to: opts.guestEmail,
    subject: `Security deposit released — ${opts.vanName}`,
    heading: "Deposit released — trip complete",
    intro: `Kia ora ${escapeHtml(opts.guestName)}, your ${escapeHtml(opts.vanName)} trip is complete. The security deposit hold has been released from your card.`,
    cta: { label: "Leave a review", href: `${appUrl()}/trips/${opts.bookingId}` },
    body: `<p style="color:#6b5d4f;font-size:13px;">Thanks for travelling with CampShare.</p>`,
  });
}

export async function sendPayoutSentEmail(opts: {
  hostEmail: string;
  hostName: string;
  vanName: string;
  bookingId: string;
  amountCents: number;
}): Promise<void> {
  await sendBrandedEmail({
    to: opts.hostEmail,
    subject: `Payout sent — ${opts.vanName}`,
    heading: "Your payout is on the way",
    intro: `Kia ora ${escapeHtml(opts.hostName)}, a payout of ${fmtDollars(opts.amountCents)} for your ${escapeHtml(opts.vanName)} booking has been transferred to your bank account.`,
    cta: { label: "View earnings", href: `${appUrl()}/dashboard/payouts` },
    body: `<p style="color:#6b5d4f;font-size:13px;">Funds typically arrive in 2–5 business days depending on your bank.</p>`,
  });
}

export async function sendReviewPromptEmail(opts: {
  to: string;
  recipientName: string;
  role: "guest" | "host";
  bookingId: string;
  vanName: string;
}): Promise<void> {
  const heading = opts.role === "guest" ? "How was your trip?" : "How was your guest?";
  const subject = opts.role === "guest"
    ? `How was your trip in ${opts.vanName}?`
    : `How was your guest in ${opts.vanName}?`;
  const intro = opts.role === "guest"
    ? `Kia ora ${escapeHtml(opts.recipientName)}, share how your trip in ${escapeHtml(opts.vanName)} went. Your review helps future travellers find great hosts.`
    : `Kia ora ${escapeHtml(opts.recipientName)}, leave a review for your recent guest in ${escapeHtml(opts.vanName)}. Reviews stay hidden until both sides submit, so feedback is honest.`;

  await sendBrandedEmail({
    to: opts.to,
    subject,
    heading,
    intro,
    cta: { label: "Leave a review", href: `${appUrl()}/trips/${opts.bookingId}/review` },
    body: `<p style="color:#6b5d4f;font-size:13px;">Reviews are double-blind: yours and theirs go public together once both are submitted, or after 14 days — whichever comes first.</p>`,
  });
}

export async function sendBookingMessageEmail(opts: {
  recipientEmail: string;
  recipientName: string;
  senderName: string;
  vanName: string;
  bookingId: string;
  messagePreview: string;
  viewerRole: "guest" | "host";
}): Promise<void> {
  const href = opts.viewerRole === "guest"
    ? `${appUrl()}/trips/${opts.bookingId}`
    : `${appUrl()}/dashboard/bookings/${opts.bookingId}`;
  await sendBrandedEmail({
    to: opts.recipientEmail,
    subject: `New message about your CampShare booking`,
    heading: "New message",
    intro: `Kia ora ${escapeHtml(opts.recipientName)}, ${escapeHtml(opts.senderName)} sent you a message about the booking for ${escapeHtml(opts.vanName)}.`,
    cta: { label: "View message", href },
    body: `<p style="background:#f5ede0;border-radius:8px;padding:12px 16px;font-style:italic;">"${escapeHtml(opts.messagePreview.slice(0, 200))}${opts.messagePreview.length > 200 ? "…" : ""}"</p>`,
  });
}
