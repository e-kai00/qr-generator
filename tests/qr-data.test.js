import test from "node:test";
import assert from "node:assert/strict";
import {
  buildPayload,
  DEFAULT_SETTINGS,
  EMPTY_FIELDS,
  readHistory,
  sanitizeSnapshot,
  validateColors,
  websiteURL,
  toQRBytes,
} from "../src/qr-data.js";
const fields = (changes) => ({ ...EMPTY_FIELDS, ...changes });

test("UTF-8 bytes preserve emoji, accented contacts, and non-Latin text", () => {
  for (const text of ["Hello 🌿", "Grüße aus Köln", "東京", "مرحبا"]) {
    const binary = toQRBytes(text);
    const bytes = Uint8Array.from(binary, (character) =>
      character.charCodeAt(0),
    );
    assert.equal(new TextDecoder().decode(bytes), text);
    assert.deepEqual(bytes, new TextEncoder().encode(text));
  }
});

test("URLs require http(s), reject unsafe schemes, and normalize whitespace", () => {
  assert.equal(
    websiteURL(" https://example.com/path "),
    "https://example.com/path",
  );
  for (const input of [
    "",
    "example.com",
    "javascript:alert(1)",
    "ftp://example.com",
    "https://",
  ])
    assert.throws(() => websiteURL(input));
  assert.throws(() => buildPayload("url", fields({ url: "" })), /website URL/);
});
test("plain text preserves Unicode and meaningful whitespace", () => {
  assert.equal(
    buildPayload("text", fields({ text: " Hello 🌿\nWorld " })),
    " Hello 🌿\nWorld ",
  );
  assert.throws(
    () => buildPayload("text", fields({ text: " \n " })),
    /message/,
  );
  assert.throws(
    () => buildPayload("text", fields({ text: "🌿".repeat(301) })),
    /too long/,
  );
});
test("vCard contains required fields, CRLF endings, and escapes data", () => {
  const card = buildPayload(
    "contact",
    fields({
      firstName: "Alex",
      lastName: "Morgan;Jr",
      organization: "A,B\nStudio",
      email: "alex@example.com",
      phone: "+1 555 0123",
      website: "https://example.com/alex",
    }),
  );
  assert.equal(
    card,
    "BEGIN:VCARD\r\nVERSION:3.0\r\nN:Morgan\\;Jr;Alex;;;\r\nFN:Alex Morgan\\;Jr\r\nORG:A\\,B\\nStudio\r\nEMAIL:alex@example.com\r\nTEL:+1 555 0123\r\nURL:https://example.com/alex\r\nEND:VCARD",
  );
  assert.throws(() => buildPayload("contact", fields({})), /name/);
  assert.throws(
    () =>
      buildPayload("contact", fields({ firstName: "Alex", email: "invalid" })),
    /email/,
  );
  assert.throws(
    () =>
      buildPayload(
        "contact",
        fields({ firstName: "Alex", website: "example.com" }),
      ),
    /URL/,
  );
});
test("colors enforce sufficient contrast and dark-on-light polarity", () => {
  assert.doesNotThrow(() => validateColors("#213d32", "#ffffff"));
  assert.doesNotThrow(() => validateColors("#000000", "#ffffff"));
  assert.throws(() => validateColors("#ffffff", "#000000"), /darker/);
  assert.throws(() => validateColors("#eeeeee", "#ffffff"), /contrast/);
  assert.throws(() => validateColors("red", "#ffffff"), /valid/);
});
test("history round trips complete content and settings and rejects malformed entries", () => {
  const entry = {
    type: "contact",
    fields: fields({ firstName: "Alex", email: "alex@example.com" }),
    settings: { ...DEFAULT_SETTINGS, style: "dots", size: 2048 },
    id: "one",
    createdAt: 1720000000000,
    thumbnail: "",
  };
  assert.deepEqual(readHistory(JSON.stringify([entry])), [entry]);
  assert.deepEqual(readHistory(null), []);
  assert.deepEqual(
    readHistory(
      JSON.stringify([
        null,
        {},
        { ...entry, type: "unknown" },
        { ...entry, type: "wifi" },
      ]),
    ),
    [],
  );
  assert.throws(() => readHistory("{broken"));
  assert.throws(() => readHistory("{}"));
});
test("untrusted storage cannot supply external or SVG image URLs", () => {
  for (const logo of [
    "https://example.com/logo.png",
    "data:image/svg+xml;base64,ABC",
    "javascript:alert(1)",
  ]) {
    const restored = sanitizeSnapshot({
      type: "text",
      fields: fields({ text: "hello" }),
      settings: {
        foreground: "red",
        background: null,
        size: 9999,
        style: "invalid",
        logo,
      },
    });
    assert.deepEqual(restored.settings, DEFAULT_SETTINGS);
  }
  const many = Array.from({ length: 30 }, (_, i) => ({
    type: "text",
    fields: fields({ text: "hello" }),
    settings: DEFAULT_SETTINGS,
    id: String(i),
    createdAt: 123,
  }));
  assert.equal(readHistory(JSON.stringify(many)).length, 24);
});
