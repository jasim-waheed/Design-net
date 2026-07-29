// ============================================================
// EMAIL NOTIFICATION SETTINGS (send contact form messages to Gmail)
// Same as the original project — fill these in via EmailJS to get
// every contact-form message emailed to your Gmail.
// ============================================================

export const emailConfig = {
  enabled: false, // set to true once you've filled in the values below
  serviceId: "YOUR_EMAILJS_SERVICE_ID",
  templateId: "YOUR_EMAILJS_TEMPLATE_ID",
  publicKey: "YOUR_EMAILJS_PUBLIC_KEY",
  toEmail: "youraddress@gmail.com", // apna gmail yahan daalein
};

export async function sendEmailNotification(msg) {
  if (!emailConfig.enabled) return { skipped: true };
  try {
    const res = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service_id: emailConfig.serviceId,
        template_id: emailConfig.templateId,
        user_id: emailConfig.publicKey,
        template_params: {
          from_name: msg.name,
          from_contact: msg.contact || "Not provided",
          message: msg.message,
          to_email: emailConfig.toEmail,
        },
      }),
    });
    return { ok: res.ok };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}
