const INBOX = "dasumo.site@gmail.com";
const MAX_REQUEST_BYTES = 320 * 1024;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;
const SMS_RECIPIENT = /^\+?[1-9]\d{7,14}$/u;
const SMS_SENDER = /^(?:[a-z0-9]{3,11}|\d{3,15})$/iu;

const sections = [
  ["Your business", [
    ["business", "Business name", 250, true],
    ["description", "What does your business do?", 4000, true],
    ["audience", "Who are your customers?", 4000],
    ["area", "Where do you operate?", 250],
  ]],
  ["Contact details", [
    ["name", "Your name", 250, true],
    ["email", "Your email", 250, true],
    ["phone", "Your phone number", 250],
    ["publicContact", "Contact details for the website", 4000],
  ]],
  ["What you need", [
    ["goal", "What should visitors do?", 4000],
    ["pages", "Pages or sections you need", 4000],
    ["features", "Features you have in mind", 1000],
    ["workflow", "How should those features work?", 4000],
  ]],
  ["Content and design", [
    ["content", "Products, services and prices", 4000],
    ["about", "Your story and key selling points", 4000],
    ["assets", "Logo, photos and written content", 250],
    ["folder", "Shared folder or file links", 4000],
    ["style", "Colours, style and references", 4000],
  ]],
  ["Timing and setup", [
    ["existing", "Current website and domain", 4000],
    ["budget", "Budget range (SGD)", 250],
    ["deadline", "Preferred launch timing", 250],
    ["support", "Help after launch", 250],
    ["other", "Anything else to know?", 4000],
  ]],
];

function reply(status, body, headers = {}) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store", ...headers },
  });
}

async function readPayload(request) {
  const reader = request.body?.getReader();
  if (!reader) return null;
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let bytes = 0;
  let text = "";

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_REQUEST_BYTES) {
        await reader.cancel();
        return null;
      }
      text += decoder.decode(value, { stream: true });
    }
    return JSON.parse(text + decoder.decode());
  } catch {
    return null;
  } finally {
    reader.releaseLock();
  }
}

function readAnswers(payload) {
  const features = payload.features ?? [];
  if (!Array.isArray(features) || features.length > 9 ||
      features.some((value) => typeof value !== "string" || value.length > 100)) {
    return null;
  }

  const answers = {};
  for (const [, fields] of sections) {
    for (const [key, , limit, required] of fields) {
      const value = key === "features" ? features.join(", ") : (payload[key] ?? "");
      if (typeof value !== "string" || value.length > limit) return null;
      answers[key] = value.trim();
      if (required && !answers[key]) return null;
    }
  }
  return EMAIL.test(answers.email) ? answers : null;
}

function formatAnswers(answers) {
  return sections.map(([heading, fields]) => {
    const lines = fields.map(([key, question]) =>
      question + "\n" + (answers[key] || "Not provided."));
    return heading + "\n\n" + lines.join("\n\n");
  }).join("\n\n--------------------\n\n");
}

async function postToBrevo(path, key, payload) {
  const response = await fetch("https://api.brevo.com/v3" + path, {
    method: "POST",
    headers: {
      "api-key": key,
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(10000),
    body: JSON.stringify(payload),
  });
  return response.status;
}

async function sendSmsAlert(key, sender, recipient) {
  if (!SMS_SENDER.test(sender) || !SMS_RECIPIENT.test(recipient)) {
    console.warn("Website brief SMS settings are incomplete or invalid.");
    return;
  }

  try {
    const status = await postToBrevo("/transactionalSMS/send", key, {
      sender,
      recipient: recipient.replace(/^\+/u, ""),
      content: "SumoSites: New website enquiry. Check your email for the full brief.",
      type: "transactional",
    });
    if (status !== 201) console.warn("Brevo did not accept the website brief SMS.", { status });
  } catch {
    console.warn("The website brief SMS request to Brevo failed.");
  }
}

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== "POST") {
    return reply(405, { ok: false }, { Allow: "POST" });
  }
  if (request.headers.get("Origin") !== new URL(request.url).origin) {
    return reply(403, { ok: false });
  }
  const type = request.headers.get("Content-Type")?.split(";")[0].trim().toLowerCase();
  if (type !== "application/json") return reply(415, { ok: false });
  if (Number(request.headers.get("Content-Length")) > MAX_REQUEST_BYTES) {
    return reply(413, { ok: false });
  }
  const payload = await readPayload(request);
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return reply(400, { ok: false });
  }
  if (payload.websiteUrl) return reply(400, { ok: false });
  const answers = readAnswers(payload);
  if (!answers) return reply(400, { ok: false });

  const key = env.BREVO_API_KEY?.trim();
  const sender = env.BREVO_SENDER_EMAIL?.trim();
  if (!key || !sender || !EMAIL.test(sender)) return reply(503, { ok: false });

  const business = answers.business.replace(/\s+/gu, " ").slice(0, 120);
  try {
    const status = await postToBrevo("/smtp/email", key, {
      sender: { email: sender, name: "SumoSites" },
      to: [{ email: INBOX }],
      replyTo: { email: answers.email },
      subject: "Website enquiry — " + business,
      textContent: formatAnswers(answers),
    });
    if (status !== 201) return reply(502, { ok: false });
  } catch {
    return reply(502, { ok: false });
  }

  const smsSender = env.BREVO_SMS_SENDER?.trim() ?? "";
  const smsRecipient = env.BREVO_SMS_RECIPIENT?.trim() ?? "";
  // A missed alert must not make a visitor resend an enquiry already accepted by Brevo.
  if (smsSender || smsRecipient) context.waitUntil(sendSmsAlert(key, smsSender, smsRecipient));
  return reply(200, { ok: true });
}
