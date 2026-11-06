// Pure helpers: QR payloads and validation can be tested without a browser.
export const DEFAULT_SETTINGS = Object.freeze({
  foreground: "#213d32",
  background: "#ffffff",
  style: "rounded",
  size: 1024,
  logo: "",
});
export const TYPES = ["url", "text", "contact"];
export const TYPE_LABELS = {
  url: "Website",
  text: "Text",
  contact: "Contact",
};
export const EMPTY_FIELDS = Object.freeze({
  url: "",
  text: "",
  firstName: "",
  lastName: "",
  organization: "",
  email: "",
  phone: "",
  website: "",
});
const fail = (message) => {
  throw new Error(message);
};

export function websiteURL(value) {
  let parsed;
  try {
    parsed = new URL(value.trim());
  } catch {
    fail("Enter a full website URL, starting with https:// or http://.");
  }
  if (!["https:", "http:"].includes(parsed.protocol) || !parsed.hostname)
    fail("Use a website URL starting with https:// or http://.");
  return parsed.href;
}

export function escapeVCard(value) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}
// qrcode-generator 1.4.4's default Byte encoder reads each character's low byte.
// Supply UTF-8 as a binary string so names, emoji, and international text survive.
// Keep this adapter paired with the pinned encoder version in package.json.
export function toQRBytes(value) {
  return Array.from(new TextEncoder().encode(value), (byte) =>
    String.fromCharCode(byte),
  ).join("");
}

const cleanLine = (value) =>
  value.trim().replace(/[\r\n\u0000-\u001f\u007f]/g, "");

export function buildPayload(type, fields) {
  let data;
  if (type === "url") {
    if (!fields.url.trim()) fail("Add a website URL to create your code.");
    data = websiteURL(fields.url);
  } else if (type === "text") {
    if (!fields.text.trim()) fail("Write a message to create your code.");
    data = fields.text;
  } else if (type === "contact") {
    const first = fields.firstName.trim();
    const last = fields.lastName.trim();
    if (!first && !last)
      fail("Add at least a first or last name for your contact.");
    const email = cleanLine(fields.email);
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      fail("Enter a valid contact email address.");
    const lines = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      `N:${escapeVCard(last)};${escapeVCard(first)};;;`,
      `FN:${escapeVCard([first, last].filter(Boolean).join(" "))}`,
    ];
    if (fields.organization.trim())
      lines.push(`ORG:${escapeVCard(fields.organization.trim())}`);
    if (email) lines.push(`EMAIL:${escapeVCard(email)}`);
    if (fields.phone.trim())
      lines.push(`TEL:${escapeVCard(cleanLine(fields.phone))}`);
    if (fields.website.trim()) lines.push(`URL:${websiteURL(fields.website)}`);
    lines.push("END:VCARD");
    data = lines.join("\r\n");
  } else fail("Choose a QR code type.");
  // H-level byte-mode capacity is finite. Leave headroom and avoid overly dense codes.
  if (new TextEncoder().encode(data).length > 1200)
    fail(
      "This content is too long. Keep the encoded content under 1,200 UTF-8 bytes (fewer for emoji and accented text).",
    );
  return data;
}

export function previewContent(type, fields) {
  const keys = {
    url: ["url"],
    text: ["text"],
    contact: [
      "firstName",
      "lastName",
      "organization",
      "email",
      "phone",
      "website",
    ],
  }[type];
  const isSample = Boolean(keys) && keys.every((key) => !fields[key].trim());
  return {
    data: isSample
      ? "https://e-kai00.github.io/qr-generator/"
      : buildPayload(type, fields),
    isSample,
  };
}

export function luminance(hex) {
  const rgb = hex
    .slice(1)
    .match(/../g)
    .map((value) => parseInt(value, 16) / 255)
    .map((value) =>
      value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
    );
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}
export function validateColors(foreground, background) {
  if (![foreground, background].every((value) => /^#[\da-f]{6}$/i.test(value)))
    fail("Choose valid foreground and background colors.");
  const fg = luminance(foreground),
    bg = luminance(background);
  if (fg >= bg)
    fail(
      "Choose a darker code color and a lighter background for reliable scanning.",
    );
  if ((bg + 0.05) / (fg + 0.05) < 4.5)
    fail(
      "These colors need more contrast. Darken the code or lighten the background.",
    );
}
export function codeTitle(type, fields) {
  if (type === "url") return fields.url.trim();
  if (type === "text") return fields.text.trim().slice(0, 70);
  return [fields.firstName, fields.lastName].filter(Boolean).join(" ");
}

// Treat localStorage as untrusted input, including values left by older versions.
export function sanitizeSnapshot(value) {
  if (!value || !TYPES.includes(value.type) || !value.fields || !value.settings)
    return null;
  const fields = {};
  for (const [key, initial] of Object.entries(EMPTY_FIELDS)) {
    fields[key] =
      typeof value.fields[key] === "string"
        ? value.fields[key].slice(0, 1800)
        : initial;
  }
  const source = value.settings;
  const settings = {
    foreground: /^#[\da-f]{6}$/i.test(source.foreground)
      ? source.foreground
      : DEFAULT_SETTINGS.foreground,
    background: /^#[\da-f]{6}$/i.test(source.background)
      ? source.background
      : DEFAULT_SETTINGS.background,
    style: ["square", "rounded", "dots"].includes(source.style)
      ? source.style
      : DEFAULT_SETTINGS.style,
    size: [512, 1024, 2048].includes(source.size)
      ? source.size
      : DEFAULT_SETTINGS.size,
    logo:
      typeof source.logo === "string" &&
      /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(
        source.logo,
      ) &&
      source.logo.length < 400000
        ? source.logo
        : "",
  };
  return { type: value.type, fields, settings };
}

export function readHistory(raw) {
  if (!raw) return [];
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error("Invalid history format");
  return parsed.slice(0, 24).flatMap((entry) => {
    const snapshot = sanitizeSnapshot(entry);
    if (
      !snapshot ||
      typeof entry.id !== "string" ||
      !Number.isFinite(entry.createdAt)
    )
      return [];
    const thumbnail =
      typeof entry.thumbnail === "string" &&
      /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(entry.thumbnail) &&
      entry.thumbnail.length < 200000
        ? entry.thumbnail
        : "";
    return [
      {
        ...snapshot,
        id: entry.id.slice(0, 100),
        createdAt: entry.createdAt,
        thumbnail,
      },
    ];
  });
}
