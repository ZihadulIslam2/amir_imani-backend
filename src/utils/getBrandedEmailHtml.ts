export interface BrandEmailOptions {
  title?: string;
  bodyHtml: string;
  ctaText?: string;
  ctaUrl?: string;
  footerText?: string;
}

export const getBrandedEmailHtml = (options: BrandEmailOptions): string => {
  const logoUrl =
    process.env.LOGO_URL || 'https://doundogames.com/logo-white.png';
  const websiteUrl = process.env.FRONTEND_URL || 'https://doundogames.com';
  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${options.title || 'Doundo Games'}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #FAF6EE; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1F2937; -webkit-font-smoothing: antialiased; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border: 1px solid #e5e7eb; }
    .header { background-color: #0E1D2B; padding: 36px 24px; text-align: center; }
    .header img { height: 50px; max-width: 260px; object-fit: contain; display: block; margin: 0 auto; }
    .header h1 { margin: 16px 0 0 0; font-size: 22px; color: #ffffff; font-weight: 700; letter-spacing: -0.01em; }
    .content { padding: 36px 32px; background-color: #ffffff; line-height: 1.6; font-size: 15px; color: #374151; }
    .cta-container { text-align: center; margin: 32px 0 16px 0; }
    .cta-button { display: inline-block; background-color: #F04D2A; color: #ffffff !important; text-decoration: none; font-weight: 700; font-size: 14px; padding: 14px 36px; border-radius: 6px; letter-spacing: 0.05em; text-transform: uppercase; box-shadow: 0 4px 12px rgba(240,77,42,0.3); }
    .footer { padding: 24px 32px; background-color: #F4F7FB; border-top: 1px solid #e5e7eb; text-align: center; color: #6B7280; font-size: 13px; line-height: 1.6; }
    .footer-brand { margin: 0 0 4px 0; font-weight: 700; color: #0E1D2B; font-size: 14px; }
    .footer-tagline { margin: 0 0 12px 0; font-size: 12px; color: #0EA5B8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; }
    .footer-copy { margin: 0; font-size: 12px; color: #9CA3AF; }
    @media only screen and (max-width: 600px) {
      .content { padding: 24px 20px !important; }
      .header { padding: 28px 16px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#FAF6EE;font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;color:#1F2937;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#FAF6EE;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" class="container" style="max-width:600px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);border:1px solid #e5e7eb;">
          <!-- Header Banner -->
          <tr>
            <td class="header" style="background-color:#0E1D2B;padding:36px 24px;text-align:center;">
              <a href="${websiteUrl}" target="_blank" style="text-decoration:none;display:inline-block;">
                <img src="${logoUrl}" alt="Doundo Games" style="height:50px;max-width:260px;object-fit:contain;display:block;margin:0 auto;" />
              </a>
              ${
                options.title
                  ? `<h1 style="margin:16px 0 0 0;font-size:22px;color:#ffffff;font-weight:700;letter-spacing:-0.01em;">${options.title}</h1>`
                  : ''
              }
            </td>
          </tr>
          <!-- Main Content -->
          <tr>
            <td class="content" style="padding:36px 32px;background-color:#ffffff;line-height:1.6;font-size:15px;color:#374151;">
              ${options.bodyHtml}
              ${
                options.ctaText && options.ctaUrl
                  ? `
                    <div class="cta-container" style="text-align:center;margin:32px 0 16px 0;">
                      <a href="${options.ctaUrl}" target="_blank" class="cta-button" style="display:inline-block;background-color:#F04D2A;color:#ffffff !important;text-decoration:none;font-weight:700;font-size:14px;padding:14px 36px;border-radius:6px;letter-spacing:0.05em;text-transform:uppercase;box-shadow:0 4px 12px rgba(240,77,42,0.3);">
                        ${options.ctaText}
                      </a>
                    </div>
                  `
                  : ''
              }
            </td>
          </tr>
          <!-- Footer Banner -->
          <tr>
            <td class="footer" style="padding:24px 32px;background-color:#F4F7FB;border-top:1px solid #e5e7eb;text-align:center;color:#6B7280;font-size:13px;line-height:1.6;">
              <p class="footer-brand" style="margin:0 0 4px 0;font-weight:700;color:#0E1D2B;font-size:14px;">DOUNDO GAMES</p>
              <p class="footer-tagline" style="margin:0 0 12px 0;font-size:12px;color:#0EA5B8;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;">A Universe of Games for Curious Minds</p>
              <p class="footer-copy" style="margin:0;font-size:12px;color:#9CA3AF;">${
                options.footerText ||
                `© ${year} Doundo Games. All rights reserved.`
              }</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};
