// Confirmation email sent to everyone who submits the contact form.

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function firstName(fullName: string): string {
  const first = fullName.trim().split(/\s+/)[0] ?? "";
  return first || "there";
}

export const confirmationSubject = "We've received your details";

export function confirmationText(name: string): string {
  return [
    `Thank you, ${name}.`,
    "",
    "We've received your details and a member of our team will reach out to you shortly.",
    "",
    "In the meantime, if there's anything you'd like to add, simply reply to this email.",
    "",
    "The Novum team",
    "https://novum-foods.com",
    "",
    "You're receiving this email because you submitted your details on our website.",
  ].join("\n");
}

export function confirmationHtml(name: string): string {
  const first_name = escapeHtml(name);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>We've received your details</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f1;">
<div style="display:none;max-height:0;overflow:hidden;">Thank you for getting in touch with Novum.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f4f1;">
  <tr>
    <td align="center" style="padding:40px 16px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#ffffff;font-family:Helvetica,Arial,sans-serif;color:#0f1110;">
        <!-- Header -->
        <tr>
          <td style="background:#0b0c0b;padding:28px 40px;">
            <span style="font-size:18px;font-weight:bold;letter-spacing:1px;color:#ffffff;">NOVUM</span>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:48px 40px 16px 40px;">
            <div style="font-family:'Courier New',Courier,monospace;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#767a75;">Received</div>
            <h1 style="margin:14px 0 0 0;font-size:30px;line-height:36px;font-weight:bold;letter-spacing:-0.5px;color:#0f1110;">Thank you, ${first_name}.</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 40px 0 40px;font-size:16px;line-height:26px;color:#3a3d3a;">
            <p style="margin:0 0 18px 0;">We've received your details and a member of our team will reach out to you shortly.</p>
            <p style="margin:0 0 18px 0;">In the meantime, if there's anything you'd like to add, simply reply to this email.</p>
          </td>
        </tr>
        <!-- CTA -->
        <tr>
          <td style="padding:16px 40px 48px 40px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="background:#0f1110;border-radius:999px;">
                  <a href="https://novum-foods.com" style="display:inline-block;padding:14px 28px;font-size:14px;font-weight:bold;color:#ffffff;text-decoration:none;">Visit novum-foods.com</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- Sign-off -->
        <tr>
          <td style="padding:0 40px 40px 40px;border-top:1px solid #e4e5e1;">
            <p style="margin:28px 0 0 0;font-size:15px;line-height:24px;color:#0f1110;">The Novum team</p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f4f4f1;padding:24px 40px;font-size:12px;line-height:19px;color:#767a75;">
            Novum &middot; Food innovation &middot; Middle East &amp; North Africa<br>
            <a href="https://novum-foods.com" style="color:#767a75;text-decoration:underline;">novum-foods.com</a><br><br>
            You're receiving this email because you submitted your details on our website.
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

// Internal heads-up to the team so new leads don't sit unnoticed in the table.
export function notificationText(lead: {
  role: string | null;
  full_name: string;
  company: string | null;
  email: string;
  message: string | null;
}): string {
  return [
    "New enquiry from novum-foods.com",
    "",
    `Name:    ${lead.full_name}`,
    `Email:   ${lead.email}`,
    `Company: ${lead.company ?? "-"}`,
    `Role:    ${lead.role ?? "-"}`,
    "",
    "Message:",
    lead.message ?? "-",
  ].join("\n");
}
