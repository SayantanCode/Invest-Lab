// Brevo's transactional email REST API — a single JSON POST, so no SDK
// dependency is needed.
//
// The "from" address must be a verified sender in Brevo
// (Settings → Senders, domains, IPs).

const BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email";

const FROM_NAME = "InvestLab (no-reply)";
const FROM_EMAIL = process.env.BREVO_FROM_EMAIL;

function renderOtpEmailHtml(
  code: string,
  { eyebrow, heading, description }: { eyebrow: string; heading: string; description: string }
): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />

  <title>${heading}</title>

  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f4f6f8;
      font-family:
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        Roboto,
        Helvetica,
        Arial,
        sans-serif;
      color: #17202a;
    }

    .wrapper {
      width: 100%;
      padding: 48px 16px;
      box-sizing: border-box;
    }

    .container {
      width: 100%;
      max-width: 520px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #e7eaee;
      border-radius: 18px;
      overflow: hidden;
    }

    .header {
      padding: 28px 32px;
      border-bottom: 1px solid #eef0f2;
    }

    .brand {
      font-size: 20px;
      font-weight: 700;
      letter-spacing: -0.4px;
      color: #111827;
    }

    .brand-mark {
      display: inline-block;
      width: 9px;
      height: 9px;
      margin-right: 7px;
      border-radius: 50%;
      background: #16a34a;
      vertical-align: 2px;
    }

    .content {
      padding: 40px 32px 36px;
    }

    .eyebrow {
      margin: 0 0 10px;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 1.2px;
      text-transform: uppercase;
      color: #16a34a;
    }

    h1 {
      margin: 0;
      font-size: 28px;
      line-height: 1.25;
      letter-spacing: -0.7px;
      color: #111827;
    }

    .description {
      margin: 14px 0 0;
      font-size: 15px;
      line-height: 1.7;
      color: #667085;
    }

    .otp-wrapper {
      margin: 30px 0;
      text-align: center;
    }

    .otp {
      display: inline-block;
      padding: 18px 28px;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 14px;
      color: #15803d;
      font-size: 34px;
      font-weight: 700;
      letter-spacing: 8px;
      line-height: 1;
      font-family:
        "SFMono-Regular",
        Consolas,
        "Liberation Mono",
        monospace;
    }

    .expiry {
      margin: 0;
      font-size: 13px;
      line-height: 1.6;
      color: #98a2b3;
      text-align: center;
    }

    .security {
      margin-top: 30px;
      padding: 16px 18px;
      background: #f8fafc;
      border: 1px solid #eef2f6;
      border-radius: 12px;
    }

    .security-title {
      margin: 0 0 5px;
      font-size: 13px;
      font-weight: 600;
      color: #344054;
    }

    .security-text {
      margin: 0;
      font-size: 12px;
      line-height: 1.6;
      color: #667085;
    }

    .footer {
      padding: 22px 32px 28px;
      border-top: 1px solid #eef0f2;
      text-align: center;
    }

    .footer p {
      margin: 0;
      font-size: 11px;
      line-height: 1.6;
      color: #98a2b3;
    }

    @media (max-width: 600px) {
      .wrapper {
        padding: 24px 12px;
      }

      .header {
        padding: 24px;
      }

      .content {
        padding: 32px 24px;
      }

      .footer {
        padding: 20px 24px 24px;
      }

      h1 {
        font-size: 24px;
      }

      .otp {
        font-size: 28px;
        letter-spacing: 6px;
        padding: 16px 22px;
      }
    }
  </style>
</head>

<body>
  <div class="wrapper">
    <div class="container">

      <!-- Brand -->
      <div class="header">
        <div class="brand">
          <span class="brand-mark"></span>
          InvestLab
        </div>
      </div>

      <!-- Content -->
      <div class="content">

        <p class="eyebrow">${eyebrow}</p>

        <h1>${heading}</h1>

        <p class="description">
          ${description}
        </p>

        <!-- OTP -->
        <div class="otp-wrapper">
          <div class="otp">${code}</div>
        </div>

        <p class="expiry">
          This code expires in <strong>10 minutes</strong>.
        </p>

        <!-- Security notice -->
        <div class="security">
          <p class="security-title">
            Keep your code private
          </p>

          <p class="security-text">
            InvestLab will never ask you to share your verification code.
            If you didn't request this email, you can safely ignore it.
          </p>
        </div>

      </div>

      <!-- Footer -->
      <div class="footer">
        <p>
          This is an automated message from InvestLab.<br />
          Please do not reply to this email.
        </p>
      </div>

    </div>
  </div>
</body>
</html>
`;
}

async function sendOtpStyleEmail(
  to: string,
  code: string,
  { subject, eyebrow, heading, description, textIntro }: { subject: string; eyebrow: string; heading: string; description: string; textIntro: string }
): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY;

  if (!apiKey) {
    throw new Error("BREVO_API_KEY is not set — add it to .env.local to send verification emails.");
  }

  if (!FROM_EMAIL) {
    throw new Error("BREVO_FROM_EMAIL is not set — it must be a sender verified in your Brevo account.");
  }

  const res = await fetch(BREVO_ENDPOINT, {
    method: "POST",

    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },

    body: JSON.stringify({
      sender: {
        name: FROM_NAME,
        email: FROM_EMAIL,
      },

      to: [
        {
          email: to,
        },
      ],

      subject,

      htmlContent: renderOtpEmailHtml(code, { eyebrow, heading, description }),

      textContent: [
        `InvestLab — ${textIntro}`,
        "",
        "Your code is:",
        "",
        code,
        "",
        "This code expires in 10 minutes.",
        "",
        "InvestLab will never ask you to share your verification code.",
        "If you didn't request this email, you can safely ignore it.",
      ].join("\n"),
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");

    throw new Error(`Brevo send failed (${res.status}): ${body}`);
  }
}

export async function sendOtpEmail(to: string, code: string): Promise<void> {
  await sendOtpStyleEmail(to, code, {
    subject: "Your InvestLab OTP — Verify your email",
    eyebrow: "Email verification",
    heading: "Verify your email address",
    description: "Use the verification code below to complete your InvestLab sign-up and secure your account.",
    textIntro: "Email Verification",
  });
}

export async function sendPasswordResetEmail(to: string, code: string): Promise<void> {
  await sendOtpStyleEmail(to, code, {
    subject: "Your InvestLab password reset code",
    eyebrow: "Password reset",
    heading: "Reset your password",
    description: "Use the code below to reset your InvestLab password. If you didn't request this, your account is still safe — just ignore this email.",
    textIntro: "Password Reset",
  });
}

/** pdfBase64 is the report PDF's bytes, base64-encoded — generated client-side (the data it's built from is localStorage-only) and handed to this server-side sender as an attachment. */
export async function sendReportEmail(to: string, pdfBase64: string, filename: string): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    throw new Error("BREVO_API_KEY is not set — add it to .env.local to send emails.");
  }
  if (!FROM_EMAIL) {
    throw new Error("BREVO_FROM_EMAIL is not set — it must be a sender verified in your Brevo account.");
  }

  const res = await fetch(BREVO_ENDPOINT, {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      sender: { name: FROM_NAME, email: FROM_EMAIL },
      to: [{ email: to }],
      subject: "Your InvestLab financial snapshot",
      htmlContent: `<!DOCTYPE html><html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#17202a;padding:24px;">
        <p>Here's the financial snapshot you asked for, attached as a PDF.</p>
        <p style="color:#667085;font-size:13px;">Didn't request this? You can safely ignore this email — nothing was changed on your account.</p>
      </body></html>`,
      textContent: "Here's the financial snapshot you asked for, attached as a PDF.\n\nDidn't request this? You can safely ignore this email.",
      attachment: [{ content: pdfBase64, name: filename }],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Brevo send failed (${res.status}): ${body}`);
  }
}
