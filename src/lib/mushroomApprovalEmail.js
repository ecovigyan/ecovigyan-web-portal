import {
  escapeHtml,
  getBaseUrl,
  getFromEmail,
  getResendClient,
  isEmailConfigured,
} from "@/lib/email";

const SYSTEM_EMAIL = "system@ecovigyan.org";

function formatLabel(value) {
  return String(value || "")
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDate(value) {
  if (!value) {
    return "Recently submitted";
  }

  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function toAbsoluteUrl(url) {
  if (!url) {
    return "";
  }

  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  return `${getBaseUrl()}${url.startsWith("/") ? url : `/${url}`}`;
}

function buildApprovalEmailHtml({ mushroom, recipientName, detailUrl, imageUrl }) {
  const title = mushroom.commonName || mushroom.scientificName || "Your mushroom observation";
  const scientificName = mushroom.scientificName
    ? `<div style="font-size:14px; color:#0f766e; font-style:italic; margin-top:6px;">${escapeHtml(mushroom.scientificName)}</div>`
    : "";
  const imageBlock = imageUrl
    ? `
      <div style="margin: 24px 0 28px;">
        <img
          src="${escapeHtml(imageUrl)}"
          alt="${escapeHtml(title)}"
          style="display:block; width:100%; max-width:520px; height:auto; border-radius:22px; border:1px solid #d1fae5; box-shadow:0 18px 45px rgba(6, 95, 70, 0.18); margin:0 auto;"
        />
      </div>
    `
    : "";

  const infoItems = [
    mushroom.commonName ? ["Common name", mushroom.commonName] : null,
    mushroom.scientificName ? ["Scientific name", mushroom.scientificName] : null,
    mushroom.photoDateTime ? ["Observed on", formatDate(mushroom.photoDateTime)] : null,
    mushroom.fruitingSurface ? ["Found on", formatLabel(mushroom.fruitingSurface)] : null,
    mushroom.texture ? ["Texture", formatLabel(mushroom.texture)] : null,
  ].filter(Boolean);

  const detailsTable = infoItems.length
    ? `
      <div style="background:#f7fdf9; border:1px solid #d1fae5; border-radius:20px; padding:20px 22px; margin:0 0 28px;">
        ${infoItems
          .map(
            ([label, value], index) => `
              <div style="${index > 0 ? "border-top:1px solid #d1fae5; padding-top:14px; margin-top:14px;" : ""}">
                <div style="font-size:11px; text-transform:uppercase; letter-spacing:0.08em; color:#6b7280; font-weight:700;">${escapeHtml(label)}</div>
                <div style="font-size:16px; color:#111827; font-weight:600; margin-top:4px;">${escapeHtml(value)}</div>
              </div>
            `
          )
          .join("")}
      </div>
    `
    : "";

  return `
    <div style="margin:0; padding:32px 16px; background:linear-gradient(180deg, #ecfdf5 0%, #f8fafc 100%);">
      <div style="max-width:640px; margin:0 auto; background:#ffffff; border-radius:28px; overflow:hidden; border:1px solid #d1fae5; box-shadow:0 28px 60px rgba(15, 23, 42, 0.10);">
        <div style="background:linear-gradient(135deg, #047857 0%, #0f766e 50%, #115e59 100%); padding:40px 28px 72px; text-align:center; color:#ffffff;">
          <div style="display:inline-block; padding:8px 14px; border-radius:999px; background:rgba(255,255,255,0.14); border:1px solid rgba(255,255,255,0.22); font-size:12px; letter-spacing:0.08em; text-transform:uppercase; font-weight:700;">
            Observation Approved
          </div>
          <h1 style="margin:18px 0 10px; font-size:34px; line-height:1.12; font-weight:800;">
            Your mushroom observation is live
          </h1>
          <p style="margin:0 auto; max-width:500px; font-size:16px; line-height:1.7; color:rgba(255,255,255,0.88);">
            Hi ${escapeHtml(recipientName)}, your contribution has been reviewed and approved by the Eco Vigyan team. Thank you for helping grow the community record of local fungi.
          </p>
        </div>

        <div style="margin:-40px 20px 0; background:#ffffff; border-radius:24px; border:1px solid #d1fae5; padding:24px; box-shadow:0 20px 40px rgba(6, 95, 70, 0.12);">
          <div style="font-size:13px; text-transform:uppercase; letter-spacing:0.08em; color:#0f766e; font-weight:800;">Approved submission</div>
          <div style="font-size:28px; line-height:1.2; color:#111827; font-weight:800; margin-top:10px;">${escapeHtml(title)}</div>
          ${scientificName}
          ${imageBlock}
          ${detailsTable}
          <div style="text-align:center; margin:0 0 8px;">
            <a href="${escapeHtml(detailUrl)}" style="display:inline-block; background:linear-gradient(135deg, #059669 0%, #0f766e 100%); color:#ffffff; text-decoration:none; font-size:16px; font-weight:700; padding:14px 24px; border-radius:999px;">
              View Observation
            </a>
          </div>
        </div>

        <div style="padding:28px; color:#4b5563; font-size:15px; line-height:1.7;">
          <p style="margin:0 0 14px;">
            Your approved observation can now help others explore local biodiversity and learn from verified field submissions.
          </p>
          <p style="margin:0;">
            Keep documenting the fungi you find. Every careful photo and note makes the dataset stronger.
          </p>
        </div>

        <div style="padding:20px 28px 30px; border-top:1px solid #e5e7eb; color:#6b7280; font-size:12px; line-height:1.6;">
          <div style="font-weight:700; color:#065f46; margin-bottom:4px;">Eco Vigyan Foundation</div>
          <div>This is an automated approval update for your mushroom observation.</div>
        </div>
      </div>
    </div>
  `;
}

export async function sendMushroomApprovedEmail({ mushroom, recipient }) {
  const resend = getResendClient();
  const recipientEmail = recipient?.email?.trim()?.toLowerCase();

  if (!isEmailConfigured() || !resend || !recipientEmail || recipientEmail === SYSTEM_EMAIL) {
    return { sent: false, reason: "skipped" };
  }

  const recipientName = recipient.name || recipient.username || "there";
  const detailUrl = `${getBaseUrl()}/mushroom/${mushroom._id}`;
  const imageUrl = toAbsoluteUrl(mushroom.images?.[0]?.url);
  const title = mushroom.commonName || mushroom.scientificName || "Mushroom observation";

  const { data, error } = await resend.emails.send({
    from: getFromEmail(),
    to: [recipientEmail],
    subject: `Approved: ${title} is now live on Eco Vigyan`,
    html: buildApprovalEmailHtml({
      mushroom,
      recipientName,
      detailUrl,
      imageUrl,
    }),
  });

  if (error) {
    throw new Error(error.message || "Failed to send mushroom approval email");
  }

  return { sent: true, id: data?.id };
}
