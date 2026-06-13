import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export function getResendClient() {
  return resend;
}

export function isEmailConfigured() {
  return Boolean(resend && process.env.RESEND_API_KEY);
}

export function getFromEmail() {
  const configuredFrom = process.env.RESEND_FROM_EMAIL;

  if (!configuredFrom) {
    return "onboarding@resend.dev";
  }

  if (configuredFrom.includes("<") && configuredFrom.includes(">")) {
    const emailMatch = configuredFrom.match(/<([^>]+)>/);
    if (emailMatch) {
      return emailMatch[1];
    }
  }

  return configuredFrom;
}

export function getBaseUrl() {
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL;
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return "http://localhost:3000";
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
