/**
 * Email Service — Nodemailer + Gmail
 *
 * Sends professional HTML emails with embedded QR code for:
 * - Visitor approval notification (QR pass image inline in email)
 * - Visitor rejection notification
 *
 * Configure in .env:
 *   GMAIL_USER=pranshuchauhan149@gmail.com
 *   GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
 */

const nodemailer = require('nodemailer');
const QRCode     = require('qrcode');

// ─── Transporter ──────────────────────────────────────────────────────────────
let transporter = null;

const getTransporter = () => {
  if (!transporter) {
    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_APP_PASSWORD;

    if (!user || !pass || pass === 'YOUR_APP_PASSWORD_HERE') {
      console.warn('⚠️  Email service not configured — set GMAIL_USER and GMAIL_APP_PASSWORD in .env');
      return null;
    }

    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
    });
  }
  return transporter;
};

// ─── Generate QR as base64 PNG ────────────────────────────────────────────────
const generateQRBase64 = async (payload) => {
  try {
    const dataUrl = await QRCode.toDataURL(payload, {
      width:           300,
      margin:          2,
      color: { dark: '#0f172a', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    });
    // dataUrl = "data:image/png;base64,iVBOR..."
    return dataUrl.split(',')[1]; // return only base64 part
  } catch {
    return null;
  }
};

// ─── Approval Email ───────────────────────────────────────────────────────────
const sendApprovalEmail = async ({ visitor, pass, approvedByName }) => {
  const tp = getTransporter();
  if (!tp)               return;
  if (!visitor.email)    return; // visitor ne email nahi diya

  const visitDate = new Date(visitor.visitDate).toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  // Generate QR code PNG as base64
  const qrPayload = pass?.qrPayload || JSON.stringify({ passCode: pass?.passCode, visitorId: visitor._id });
  const qrBase64  = pass ? await generateQRBase64(qrPayload) : null;

  // Build attachments array for inline QR image
  const attachments = [];
  if (qrBase64) {
    attachments.push({
      filename:    'visitor-pass-qr.png',
      content:     qrBase64,
      encoding:    'base64',
      cid:         'visitorQR', // content-id referenced in HTML as cid:visitorQR
    });
  }

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Visitor Pass — MoveInSync</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1b22a6 0%,#4f46e5 100%);padding:32px 40px;text-align:center;">
              <p style="margin:0;color:#a5b4fc;font-size:12px;letter-spacing:2px;text-transform:uppercase;font-weight:600;">MoveInSync</p>
              <h1 style="margin:8px 0 0;color:#ffffff;font-size:24px;font-weight:700;">Visitor Management System</h1>
            </td>
          </tr>

          <!-- Status Banner -->
          <tr>
            <td style="background:#dcfce7;padding:16px 40px;text-align:center;border-bottom:2px solid #bbf7d0;">
              <p style="margin:0;color:#15803d;font-size:18px;font-weight:700;">✅ Your Visit has been Approved!</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 40px 16px;">
              <p style="margin:0 0 8px;color:#374151;font-size:16px;">
                Dear <strong>${visitor.fullName}</strong>,
              </p>
              <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.6;">
                Your visit request to <strong>MoveInSync Office</strong> has been
                <strong style="color:#16a34a;">approved</strong> by <strong>${approvedByName}</strong>.
                Please find your digital visitor pass below.
              </p>

              <!-- Visit Details Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;margin-bottom:24px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 16px;color:#6b7280;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">Visit Details</p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:6px 0;color:#6b7280;font-size:14px;width:140px;">📅 Date</td>
                        <td style="padding:6px 0;color:#111827;font-size:14px;font-weight:600;">${visitDate}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;color:#6b7280;font-size:14px;">⏰ Time</td>
                        <td style="padding:6px 0;color:#111827;font-size:14px;font-weight:600;">${visitor.startTime} – ${visitor.endTime}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;color:#6b7280;font-size:14px;">👤 Host</td>
                        <td style="padding:6px 0;color:#111827;font-size:14px;font-weight:600;">${visitor.hostId?.name || approvedByName}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;color:#6b7280;font-size:14px;">🏢 Department</td>
                        <td style="padding:6px 0;color:#111827;font-size:14px;font-weight:600;">${visitor.hostId?.department || '—'}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;color:#6b7280;font-size:14px;">📋 Purpose</td>
                        <td style="padding:6px 0;color:#111827;font-size:14px;font-weight:600;">${visitor.purpose}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- QR Code + Pass Code Card -->
              ${pass ? `
              <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#0f172a 0%,#1e1b4b 100%);border-radius:16px;margin-bottom:24px;">
                <tr>
                  <td style="padding:28px 24px;text-align:center;">
                    <p style="margin:0 0 6px;color:#a5b4fc;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">🎫 Your Digital Visitor Pass</p>
                    <p style="margin:0 0 20px;color:#c7d2fe;font-size:13px;">Show this QR code at the front desk for entry</p>

                    <!-- QR Code Image -->
                    ${qrBase64 ? `
                    <div style="background:#ffffff;border-radius:12px;display:inline-block;padding:16px;margin-bottom:20px;">
                      <img src="cid:visitorQR" alt="Visitor QR Code" width="200" height="200"
                           style="display:block;border-radius:4px;" />
                    </div>
                    <br/>
                    ` : ''}

                    <!-- Pass Code -->
                    <p style="margin:0 0 4px;color:#a5b4fc;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">Pass Code</p>
                    <p style="margin:0 0 4px;color:#ffffff;font-size:28px;font-weight:800;letter-spacing:6px;font-family:'Courier New',monospace;">${pass.passCode}</p>
                    <p style="margin:0;color:#94a3b8;font-size:12px;">Valid: ${visitor.startTime} – ${visitor.endTime} &nbsp;|&nbsp; ${visitDate}</p>
                  </td>
                </tr>
              </table>
              ` : ''}

              <!-- Instructions -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;margin-bottom:24px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 12px;color:#1d4ed8;font-size:13px;font-weight:700;">📌 Entry Instructions</p>
                    <ol style="margin:0;padding-left:20px;color:#1e40af;font-size:13px;line-height:2;">
                      <li>Arrive during your approved time window</li>
                      <li>Show this email (QR code) or pass code <strong>${pass?.passCode || ''}</strong> at reception</li>
                      <li>Carry a valid government-issued photo ID</li>
                      <li>This pass is valid only for the approved date and time</li>
                    </ol>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 32px;color:#6b7280;font-size:13px;line-height:1.6;">
                Questions? Contact your host <strong>${visitor.hostId?.name || approvedByName}</strong> directly.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;padding:20px 40px;text-align:center;border-top:1px solid #e2e8f0;">
              <p style="margin:0;color:#9ca3af;font-size:12px;">
                Automated message from <strong>MoveInSync Visitor Management System</strong>.<br/>
                This pass is non-transferable and valid for one-time use only.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  try {
    await tp.sendMail({
      from:        `"MoveInSync VMS" <${process.env.GMAIL_USER}>`,
      to:          visitor.email,
      subject:     `🎫 Visitor Pass — ${visitDate} | MoveInSync`,
      html,
      attachments,
    });
    console.log(`📧 Approval email with QR sent to ${visitor.email}`);
  } catch (err) {
    console.error('❌ Failed to send approval email:', err.message);
    // Never block approval flow on email failure
  }
};

// ─── Rejection Email ──────────────────────────────────────────────────────────
const sendRejectionEmail = async ({ visitor, remarks, rejectedByName }) => {
  const tp = getTransporter();
  if (!tp || !visitor.email) return;

  const visitDate = new Date(visitor.visitDate).toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#1b22a6 0%,#4f46e5 100%);padding:32px 40px;text-align:center;">
              <p style="margin:0;color:#a5b4fc;font-size:12px;letter-spacing:2px;text-transform:uppercase;">MoveInSync</p>
              <h1 style="margin:8px 0 0;color:#ffffff;font-size:24px;font-weight:700;">Visitor Management System</h1>
            </td>
          </tr>
          <tr>
            <td style="background:#fee2e2;padding:16px 40px;text-align:center;border-bottom:2px solid #fecaca;">
              <p style="margin:0;color:#b91c1c;font-size:18px;font-weight:700;">❌ Visit Request Not Approved</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 40px;">
              <p style="color:#374151;font-size:16px;">Dear <strong>${visitor.fullName}</strong>,</p>
              <p style="color:#374151;font-size:15px;line-height:1.6;">
                Your visit request for <strong>${visitDate}</strong> has been
                <strong style="color:#dc2626;">declined</strong> by <strong>${rejectedByName}</strong>.
              </p>
              ${remarks && remarks !== 'No reason provided.' ? `
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;margin:20px 0;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0 0 6px;color:#991b1b;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Reason for Rejection</p>
                    <p style="margin:0;color:#7f1d1d;font-size:14px;">${remarks}</p>
                  </td>
                </tr>
              </table>
              ` : ''}
              <p style="color:#6b7280;font-size:14px;line-height:1.6;">
                Please contact your host <strong>${visitor.hostId?.name || rejectedByName}</strong> for further assistance or to reschedule your visit.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#f8fafc;padding:20px 40px;text-align:center;border-top:1px solid #e2e8f0;">
              <p style="margin:0;color:#9ca3af;font-size:12px;">
                Automated message from <strong>MoveInSync VMS</strong>. Please do not reply.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  try {
    await tp.sendMail({
      from:    `"MoveInSync VMS" <${process.env.GMAIL_USER}>`,
      to:      visitor.email,
      subject: `Visit Request Update — MoveInSync`,
      html,
    });
    console.log(`📧 Rejection email sent to ${visitor.email}`);
  } catch (err) {
    console.error('❌ Failed to send rejection email:', err.message);
  }
};

module.exports = { sendApprovalEmail, sendRejectionEmail };
