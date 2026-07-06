import { NextResponse } from "next/server";
import { Resend } from "resend";
import { connectDB } from "@/lib/mongodb";
import EventRegistration from "@/models/EventRegistration";

// Initialize Resend
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

// Simple in-memory rate limiter (10 registrations per IP per hour)
const rateLimit = new Map();
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS = 10;

// Cleanup rate limit map every hour
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of rateLimit.entries()) {
    if (now - data.startTime > RATE_LIMIT_WINDOW) {
      rateLimit.delete(ip);
    }
  }
}, RATE_LIMIT_WINDOW);

export async function POST(req) {
  try {
    // 1. Rate Limiting Check
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    const now = Date.now();
    
    const rateData = rateLimit.get(ip) || { count: 0, startTime: now };
    if (now - rateData.startTime > RATE_LIMIT_WINDOW) {
      rateData.count = 1;
      rateData.startTime = now;
    } else {
      rateData.count++;
    }
    rateLimit.set(ip, rateData);

    if (rateData.count > MAX_REQUESTS) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    // 2. Parse and validate body
    const body = await req.json();
    const { name, email, role } = body;

    if (!name || !email || !role) {
      return NextResponse.json(
        { error: "Missing required fields (name, email, role)." },
        { status: 400 }
      );
    }

    // 3. Connect to database
    await connectDB();

    // 4. Save/Update Registration in database
    let registration;
    let isNew = true;
    try {
      const existing = await EventRegistration.findOne({ email });
      if (existing) {
        existing.name = name;
        existing.role = role;
        existing.emailSent = false;
        registration = await existing.save();
        isNew = false;
        console.log("🔄 Event registration updated for:", email);
      } else {
        registration = await EventRegistration.create({
          name,
          email,
          role,
          emailSent: false,
        });
        console.log("✅ New event registration saved:", email);
      }
    } catch (dbError) {
      console.error("Database save error:", dbError);
      return NextResponse.json(
        { error: "Database error. Failed to save registration." },
        { status: 500 }
      );
    }

    // 5. Calendar Links & Attachment Generation
    const eventTitle = "Let's Put Fun in Fungi Live Session";
    const eventDateStr = "Sunday, 19 July 2026";
    const eventTimeStr = "5:00 PM - 6:00 PM IST";
    const meetingLink = "https://meet.google.com/zpp-hgnb-zus";

    // Google Calendar template URL
    const encodedTitle = encodeURIComponent(eventTitle);
    const encodedDates = "20260719T113000Z/20260719T123000Z"; // 5:00 PM - 6:00 PM IST is 11:30 AM - 12:30 PM UTC
    const encodedDetails = encodeURIComponent(
      `Join us for an exciting free online session celebrating the launch of our new nature book by Shrey Gupta. Perfect for children, educators, and anyone curious about the magical world of mushrooms!\n\nGoogle Meet Link: ${meetingLink}`
    );
    const encodedLocation = encodeURIComponent(meetingLink);
    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodedTitle}&dates=${encodedDates}&details=${encodedDetails}&location=${encodedLocation}`;

    // Generate .ics file content
    const dtstamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    const cleanEmail = email.replace(/[@.]/g, "-");
    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Eco Vigyan Foundation//Event Registration//EN",
      "METHOD:REQUEST",
      "BEGIN:VEVENT",
      `UID:fungi-event-20260719-${cleanEmail}`,
      `DTSTAMP:${dtstamp}`,
      "DTSTART:20260719T113000Z",
      "DTEND:20260719T123000Z",
      "SUMMARY:Let's Put Fun in Fungi Live Session",
      "DESCRIPTION:Join us for an exciting free online session celebrating the launch of our new nature book by Shrey Gupta. Perfect for children, educators, and anyone curious about the magical world of mushrooms!\\n\\nGoogle Meet Link: https://meet.google.com/zpp-hgnb-zus",
      "LOCATION:https://meet.google.com/zpp-hgnb-zus",
      "ORGANIZER;CN=Eco Vigyan Foundation:mailto:ecovigyanfoundation@gmail.com",
      `ATTENDEE;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE;CN=${name}:mailto:${email}`,
      "STATUS:CONFIRMED",
      "SEQUENCE:0",
      "END:VEVENT",
      "END:VCALENDAR"
    ].join("\r\n");

    // 6. Send Email Confirmation
    const emailEnabled = resend && process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

    // Setup beautiful HTML email content
    const htmlContent = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        <!-- Header Banner -->
        <div style="background: linear-gradient(135deg, #064e3b 0%, #065f46 100%); padding: 40px 24px; text-align: center; color: #ffffff;">
          <span style="background-color: rgba(249, 115, 22, 0.2); color: #ffedd5; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; padding: 6px 12px; border-radius: 9999px; display: inline-block; margin-bottom: 16px;">
            Registration Confirmed
          </span>
          <h1 style="font-size: 26px; font-weight: 800; margin: 0; font-family: Georgia, Cambria, 'Times New Roman', Times, serif; letter-spacing: -0.02em; line-height: 1.2;">
            Let's Put Fun in Fungi Live
          </h1>
          <p style="font-size: 15px; color: #a7f3d0; margin: 8px 0 0 0; font-weight: 300;">
            Online Session & Nature Book Launch by Shrey Gupta
          </p>
        </div>

        <!-- Email Body -->
        <div style="padding: 36px 32px; background-color: #ffffff;">
          <p style="margin-top: 0; font-size: 16px; color: #334155; line-height: 1.6;">
            Hi <strong>${name}</strong>,
          </p>
          <p style="font-size: 15px; color: #475569; line-height: 1.6; margin-bottom: 28px;">
            Your spot is reserved! We are thrilled to invite you to our exclusive session celebrating the launch of our new illustrated nature book. Get ready to explore the fascinating, magical world of mushrooms.
          </p>

          <!-- Event Detail Card -->
          <div style="background-color: #f8fafc; border: 1px solid #f1f5f9; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
            <h3 style="margin-top: 0; margin-bottom: 16px; font-size: 14px; font-weight: 700; color: #0f172a; text-transform: uppercase; letter-spacing: 0.05em;">
              Event Details
            </h3>
            <table border="0" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td style="padding-bottom: 12px; width: 40px; vertical-align: top;">
                  <span style="font-size: 20px;">📅</span>
                </td>
                <td style="padding-bottom: 12px;">
                  <span style="display: block; font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 600;">Date</span>
                  <span style="font-size: 15px; font-weight: 700; color: #0f172a;">${eventDateStr}</span>
                </td>
              </tr>
              <tr>
                <td style="padding-bottom: 12px; width: 40px; vertical-align: top;">
                  <span style="font-size: 20px;">⏰</span>
                </td>
                <td style="padding-bottom: 12px;">
                  <span style="display: block; font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 600;">Time</span>
                  <span style="font-size: 15px; font-weight: 700; color: #0f172a;">${eventTimeStr}</span>
                </td>
              </tr>
              <tr>
                <td style="padding-bottom: 12px; width: 40px; vertical-align: top;">
                  <span style="font-size: 20px;">💻</span>
                </td>
                <td style="padding-bottom: 12px;">
                  <span style="display: block; font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 600;">Platform</span>
                  <span style="font-size: 15px; font-weight: 700; color: #0f172a;">Google Meet</span>
                </td>
              </tr>
            </table>

            <!-- Google Meet Join Button -->
            <div style="margin-top: 20px; border-top: 1px solid #e2e8f0; padding-top: 20px; text-align: center;">
              <a href="${meetingLink}" style="display: inline-block; background-color: #059669; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 15px; padding: 12px 28px; border-radius: 9999px; box-shadow: 0 4px 6px -1px rgba(5, 150, 105, 0.2); transition: all 0.2s;">
                Join Google Meet
              </a>
              <p style="margin: 8px 0 0 0; font-size: 12px; color: #64748b;">
                Link: <a href="${meetingLink}" style="color: #059669; text-decoration: none;">${meetingLink}</a>
              </p>
            </div>
          </div>

          <!-- Calendar Sync Option -->
          <div style="text-align: center; margin-bottom: 16px;">
            <p style="margin: 0 0 12px 0; font-size: 14px; color: #475569;">
              Add this event directly to your calendar:
            </p>
            <a href="${googleCalendarUrl}" style="display: inline-flex; align-items: center; justify-content: center; background-color: #ffffff; color: #1e293b; border: 1px solid #cbd5e1; text-decoration: none; font-weight: 600; font-size: 14px; padding: 10px 20px; border-radius: 8px; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);">
              <img src="https://upload.wikimedia.org/wikipedia/commons/a/a5/Google_Calendar_icon_%282020%29.svg" alt="Google Calendar" style="width: 16px; height: 16px; margin-right: 8px; vertical-align: middle;" />
              Add to Google Calendar
            </a>
            <p style="margin: 8px 0 0 0; font-size: 11px; color: #94a3b8;">
              An invite (.ics) file is also attached to this email.
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #f1f5f9; padding: 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
          <p style="margin: 0 0 4px 0; font-weight: 600; color: #475569;">
            Eco Vigyan Foundation
          </p>
          <p style="margin: 0 0 12px 0; font-weight: 300;">
            Nurturing ecological understanding and community action.
          </p>
          <p style="margin: 0; font-size: 10px; color: #94a3b8;">
            If you did not register for this event, please ignore this email.
          </p>
        </div>
      </div>
    `;

    if (emailEnabled) {
      console.log(`Sending event email to: ${email} from: ${fromEmail}`);

      const { data, error } = await resend.emails.send({
        from: fromEmail,
        to: [email],
        subject: `Confirmed: ${eventTitle}`,
        html: htmlContent,
        attachments: [
          {
            filename: "invite.ics",
            content: Buffer.from(icsContent).toString("base64"),
            contentType: "text/calendar; method=REQUEST; charset=UTF-8",
          },
        ],
      });

      if (error) {
        console.error("Resend Event Mail Error:", error);
        await EventRegistration.findByIdAndUpdate(registration._id, {
          emailSent: false,
          emailError: error.message || JSON.stringify(error),
        });

        return NextResponse.json({
          message: isNew
            ? "Registered successfully (email failed)"
            : "Registration updated (email failed)",
          registrationId: registration._id,
          emailSent: false,
        });
      }

      await EventRegistration.findByIdAndUpdate(registration._id, {
        emailSent: true,
        emailError: null,
      });

      return NextResponse.json({
        message: isNew
          ? "Registered successfully!"
          : "Your registration details have been updated and confirmation re-sent!",
        registrationId: registration._id,
        emailSent: true,
      });
    } else {
      console.warn("⚠️ Resend is not configured. Logging event details instead:");
      console.log(`Attendee: ${name} (${email}) - ${role}`);
      
      await EventRegistration.findByIdAndUpdate(registration._id, {
        emailSent: false,
        emailError: "RESEND_API_KEY not configured",
      });

      return NextResponse.json({
        message: isNew
          ? "Registered successfully! (development mode: no email sent)"
          : "Registration updated! (development mode: no email sent)",
        registrationId: registration._id,
        emailSent: false,
      });
    }
  } catch (error) {
    console.error("Event registration API error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
