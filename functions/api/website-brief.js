const SUMOSITES_EMAIL = "dasumo.site@gmail.com";
const MAX_REQUEST_BYTES = 320 * 1024;
const FORM_CONTENT_TYPE = "application/x-www-form-urlencoded";
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;

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

function replyToForm(status) {
  if (status === 200) {
    return new Response(null, {
      status: 303,
      headers: { "Cache-Control": "no-store", Location: "/website-brief/submitted/" },
    });
  }

  const guidance = status === 400
    ? "Go back in your browser and check the four required answers before trying again."
    : "Go back in your browser to try again, or email SumoSites directly.";
  return new Response(`<!doctype html>
<html lang="en-SG">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex">
    <title>Website enquiry could not be sent | SumoSites</title>
    <link rel="stylesheet" href="/home.css">
    <link rel="stylesheet" href="/website-brief.css">
  </head>
  <body>
    <main class="wrap brief-main">
      <div class="brief-intro">
        <h1>Your answers couldn’t be sent.</h1>
        <p>${guidance}</p>
        <p><a href="mailto:${SUMOSITES_EMAIL}">${SUMOSITES_EMAIL}</a></p>
      </div>
    </main>
  </body>
</html>`, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}

async function readPayload(request, isForm, maxBytes) {
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
      if (bytes > maxBytes) {
        await reader.cancel();
        return null;
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    if (!isForm) return JSON.parse(text);

    const params = new URLSearchParams(text);
    // Native form submissions encode textarea line breaks as CRLF.
    const fields = Array.from(params, ([name, value]) => [name, value.replaceAll("\r\n", "\n")]);
    return { ...Object.fromEntries(fields), features: params.getAll("features") };
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

export async function onRequest({ request, env }) {
  if (request.method !== "POST") {
    return reply(405, { ok: false }, { Allow: "POST" });
  }
  const type = request.headers.get("Content-Type")?.split(";")[0].trim().toLowerCase();
  const isForm = type === FORM_CONTENT_TYPE;
  const respond = (status) => isForm ? replyToForm(status) : reply(status, { ok: status === 200 });
  if (request.headers.get("Origin") !== new URL(request.url).origin) {
    return respond(403);
  }
  if (!isForm && type !== "application/json") return respond(415);
  // Percent encoding may use three bytes for each byte of the original text.
  const maxBytes = isForm ? MAX_REQUEST_BYTES * 3 : MAX_REQUEST_BYTES;
  if (Number(request.headers.get("Content-Length")) > maxBytes) {
    return respond(413);
  }
  const payload = await readPayload(request, isForm, maxBytes);
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return respond(400);
  }
  if (payload.websiteUrl) return respond(400);
  const answers = readAnswers(payload);
  if (!answers) return respond(400);

  const key = env.BREVO_API_KEY?.trim();
  if (!key) return respond(503);

  const business = answers.business.replace(/\s+/gu, " ").slice(0, 120);
  try {
    const result = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": key,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(10000),
      body: JSON.stringify({
        sender: { email: SUMOSITES_EMAIL, name: "SumoSites" },
        to: [{ email: SUMOSITES_EMAIL }],
        replyTo: { email: answers.email },
        subject: "Website enquiry — " + business,
        textContent: formatAnswers(answers),
      }),
    });
    return respond(result.status === 201 ? 200 : 502);
  } catch {
    return respond(502);
  }
}
