import { Resend } from 'resend';

// Lazy-init: only create when a key is actually present at runtime (not at build time)
function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

const FROM_EMAIL = 'Flair Teams <support@flairtechlabs.com>';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://teams.flairtechlabs.com';

/** Send a @mention notification email */
export async function sendMentionEmail({
  to,
  mentionedBy,
  channelName,
  messagePreview,
  channelUrl,
}: {
  to: string;
  mentionedBy: string;
  channelName: string;
  messagePreview: string;
  channelUrl: string;
}) {
  if (!process.env.RESEND_API_KEY) return; // Skip if not configured

  await getResend()?.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `${mentionedBy} mentioned you in #${channelName}`,
    html: emailTemplate({
      title: `You were mentioned in <strong>#${channelName}</strong>`,
      body: `<strong>${mentionedBy}</strong> mentioned you:<br/><blockquote style="border-left:3px solid #FFC078;padding-left:12px;color:#555;">${escapeHtml(messagePreview)}</blockquote>`,
      ctaText: 'Open Channel',
      ctaUrl: channelUrl,
    }),
  });
}

export async function sendInviteEmail({
  to, invitedBy, teamName, role, jobTitle, inviteUrl,
}: {
  to: string;
  invitedBy: string;
  teamName: string;
  role: string;
  jobTitle?: string;
  inviteUrl: string;
}) {
  if (!process.env.RESEND_API_KEY) return;

  const roleDisplay = jobTitle ? `<strong>${escapeHtml(jobTitle)}</strong>` : `<strong>${role}</strong>`;

  await getResend()?.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `${invitedBy} invited you to join ${teamName} on Flair Teams`,
    html: emailTemplate({
      title: `You've been invited to join <strong>${escapeHtml(teamName)}</strong>`,
      body: `<strong>${escapeHtml(invitedBy)}</strong> has invited you as ${roleDisplay}. Click the button below to create your account and get started.`,
      ctaText: 'Accept Invitation',
      ctaUrl: inviteUrl,
    }),
  });
}

/** Send a welcome email after successful signup */
export async function sendWelcomeEmail({
  to, name,
}: {
  to: string;
  name: string;
}) {
  if (!process.env.RESEND_API_KEY) return;

  await getResend()?.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Welcome to Flair Teams, ${name}!`,
    html: emailTemplate({
      title: `Welcome to the team, <strong>${escapeHtml(name)}</strong>!`,
      body: `We're excited to have you here. Flair Teams is your new home for project management, task tracking, and seamless team collaboration.<br/><br/>Start by exploring your dashboard and joining your first team.`,
      ctaText: 'Go to Dashboard',
      ctaUrl: `${APP_URL}/dashboard`,
    }),
  });
}

/** Send a notification when a user is assigned a task */
export async function sendTaskAssignedEmail({
  to, taskTitle, projectName, assignedBy, taskUrl,
}: {
  to: string;
  taskTitle: string;
  projectName: string;
  assignedBy: string;
  taskUrl: string;
}) {
  if (!process.env.RESEND_API_KEY) return;

  await getResend()?.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `New Task Assigned: ${taskTitle}`,
    html: emailTemplate({
      title: `You have a new task in <strong>${escapeHtml(projectName)}</strong>`,
      body: `<strong>${escapeHtml(assignedBy)}</strong> has assigned you a new task: <br/><strong>${escapeHtml(taskTitle)}</strong>`,
      ctaText: 'View Task',
      ctaUrl: taskUrl,
    }),
  });
}

// ─── Shared email template ──────────────────────────────────────────────────
function emailTemplate({
  title, body, ctaText, ctaUrl,
}: { title: string; body: string; ctaText: string; ctaUrl: string }) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="font-family:Inter,system-ui,sans-serif;background:#FDF9EC;margin:0;padding:40px 20px;">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #EDEDED;">
    <div style="background:linear-gradient(135deg,#0A0042,#002E4D);padding:28px 32px;display:flex;align-items:center;gap:12px;">
      <img src="${APP_URL}/logo.png" alt="Flair" width="36" height="36" style="object-fit:contain"/>
      <div>
        <p style="color:rgba(255,255,255,0.5);font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;margin:0;">Flair Technologies</p>
        <p style="color:#fff;font-size:16px;font-weight:800;margin:0;">Teams</p>
      </div>
    </div>
    <div style="padding:32px;">
      <h2 style="font-size:20px;font-weight:800;color:#1B1C1B;margin:0 0 12px;">${title}</h2>
      <p style="color:#555;line-height:1.6;margin:0 0 24px;">${body}</p>
      <a href="${ctaUrl}" style="display:inline-block;background:linear-gradient(135deg,#FFC078,#DA9646);color:#1B1C1B;font-weight:700;font-size:14px;padding:12px 24px;border-radius:8px;text-decoration:none;">${ctaText} →</a>
    </div>
    <div style="padding:20px 32px;border-top:1px solid #EDEDED;text-align:center;">
      <p style="color:#999;font-size:11px;margin:0;">© ${new Date().getFullYear()} Flair Technologies — Internal use only.</p>
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(str: string) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
