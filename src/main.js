import QRCodeStyling from "qr-code-styling";
import "./style.css";
import {
  DEFAULT_SETTINGS,
  EMPTY_FIELDS,
  TYPES,
  TYPE_LABELS,
  previewContent,
  validateColors,
  codeTitle,
  readHistory,
  toQRBytes,
} from "./qr-data.js";

const $ = (id) => document.getElementById(id);
const HISTORY_KEY = "qr-studio.history.v1";
const state = { type: "url", settings: { ...DEFAULT_SETTINGS } };
let history = [];
let currentQR = null;
let generation = 0;
let renderTimer;
let toastTimer;
let logoVersion = 0;
let busy = false;

function notify(message) {
  $("toast").textContent = message;
  $("toast").hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    $("toast").hidden = true;
  }, 4500);
}
function getFields() {
  return Object.fromEntries(
    Object.keys(EMPTY_FIELDS).map((key) => [key, $(key).value]),
  );
}
function snapshot() {
  const allFields = getFields();
  // Save only the fields belonging to the selected content type.
  const activeKeys = {
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
  }[state.type];
  const fields = { ...EMPTY_FIELDS, url: "" };
  for (const key of activeKeys) fields[key] = allFields[key];
  return { type: state.type, fields, settings: { ...state.settings } };
}
function updateActions() {
  for (const id of ["download-png", "download-svg", "save-code"])
    $(id).disabled = !currentQR || busy;
}
function showError(message, content = false) {
  currentQR = null;
  $("qr-preview").replaceChildren();
  $("preview-empty").hidden = false;
  $("scan-status").textContent = message;
  $("scan-status").classList.add("invalid");
  $("content-error").hidden = !content;
  $("content-error").textContent = content ? message : "";
  updateActions();
}
function qrOptions(data, settings, size = 512) {
  return {
    width: size,
    height: size,
    type: "svg",
    data: toQRBytes(data),
    // Even the smallest (21-module) QR gets at least a 4-module quiet zone.
    margin: Math.ceil(size * 0.15),
    qrOptions: { errorCorrectionLevel: "H", mode: "Byte" },
    dotsOptions: { type: settings.style, color: settings.foreground },
    cornersSquareOptions: { type: "square", color: settings.foreground },
    cornersDotOptions: { type: "square", color: settings.foreground },
    backgroundOptions: { color: settings.background },
    image: settings.logo || undefined,
    imageOptions: {
      hideBackgroundDots: true,
      imageSize: 0.18,
      margin: Math.ceil(size * 0.008),
      saveAsBlob: true,
    },
  };
}
async function renderPreview(version) {
  const saved = snapshot();
  let data;
  let isSample;
  try {
    ({ data, isSample } = previewContent(saved.type, saved.fields));
  } catch (error) {
    if (version === generation) showError(error.message, true);
    return;
  }
  $("content-error").hidden = true;
  try {
    validateColors(saved.settings.foreground, saved.settings.background);
    const qr = new QRCodeStyling(qrOptions(data, saved.settings));
    await qr.getRawData("svg"); // Await logo embedding and surface rendering failures.
    if (version !== generation) return;
    $("qr-preview").replaceChildren();
    qr.append($("qr-preview"));
    // The sample is preview-only; saving and exporting require the user's content.
    currentQR = isSample ? null : { qr, data, saved, version };
    $("qr-preview").setAttribute(
      "aria-label",
      isSample ? "Sample QR code for the qode website" : "Generated QR code",
    );
    $("preview-empty").hidden = true;
    $("scan-status").classList.remove("invalid");
    $("scan-status").textContent = isSample
      ? "Add your content to create a code."
      : saved.settings.logo
        ? "✓ Ready to scan · test your logo before sharing"
        : "✓ Ready to scan";
    $("type-caption").textContent = isSample
      ? "SAMPLE · WEBSITE"
      : TYPE_LABELS[saved.type].toUpperCase();
    $("size-caption").textContent =
      `${saved.settings.size} × ${saved.settings.size} px`;
    updateActions();
  } catch (error) {
    if (version === generation)
      showError(
        error instanceof Error
          ? error.message
          : "Could not generate this code. Try shorter content or remove the logo.",
      );
  }
}
function schedulePreview(immediate = false) {
  clearTimeout(renderTimer);
  const version = ++generation;
  currentQR = null;
  updateActions();
  // Remove stale content as soon as input changes, including while a logo loads.
  $("qr-preview").replaceChildren();
  $("preview-empty").hidden = false;
  $("scan-status").textContent = "Updating preview…";
  $("scan-status").classList.remove("invalid");
  if (immediate) void renderPreview(version);
  else renderTimer = setTimeout(() => void renderPreview(version), 220);
}
function selectType(type, focus = false) {
  state.type = type;
  for (const button of document.querySelectorAll("[data-type]")) {
    const selected = button.dataset.type === type;
    button.setAttribute("aria-selected", String(selected));
    button.tabIndex = selected ? 0 : -1;
    $(`${button.dataset.type}-panel`).hidden = !selected;
    if (selected && focus) button.focus();
  }
  schedulePreview(true);
}
function syncSettings() {
  $("foreground").value = state.settings.foreground;
  $("background").value = state.settings.background;
  $("foreground-value").textContent = state.settings.foreground.toUpperCase();
  $("background-value").textContent = state.settings.background.toUpperCase();
  $("size").value = state.settings.size;
  document
    .querySelectorAll("[data-style]")
    .forEach((button) =>
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.style === state.settings.style),
      ),
    );
  $("logo-label").textContent = state.settings.logo
    ? "Your logo is looking good"
    : "Give your code a personal touch";
  $("remove-logo").hidden = !state.settings.logo;
}
$("content-form").addEventListener("submit", (event) => event.preventDefault());
$("content-form").addEventListener("input", () => {
  schedulePreview();
});
document.querySelectorAll("[data-type]").forEach((button) => {
  button.addEventListener("click", () => selectType(button.dataset.type));
  button.addEventListener("keydown", (event) => {
    if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    let index = TYPES.indexOf(state.type);
    if (event.key === "Home") index = 0;
    else if (event.key === "End") index = TYPES.length - 1;
    else
      index =
        (index + (event.key === "ArrowRight" ? 1 : -1) + TYPES.length) %
        TYPES.length;
    selectType(TYPES[index], true);
  });
});
for (const key of ["foreground", "background", "size"]) {
  $(key).addEventListener("input", () => {
    state.settings[key] = key === "size" ? Number($(key).value) : $(key).value;
    syncSettings();
    schedulePreview();
  });
}
document.querySelectorAll("[data-style]").forEach((button) =>
  button.addEventListener("click", () => {
    state.settings.style = button.dataset.style;
    syncSettings();
    schedulePreview(true);
  }),
);
$("reset-style").addEventListener("click", () => {
  ++logoVersion;
  state.settings = { ...DEFAULT_SETTINGS };
  $("logo").value = "";
  $("logo-feedback").textContent = "";
  syncSettings();
  schedulePreview(true);
});
$("remove-logo").addEventListener("click", () => {
  ++logoVersion;
  state.settings.logo = "";
  $("logo").value = "";
  $("logo-feedback").textContent = "";
  syncSettings();
  schedulePreview(true);
});
const blobToDataURL = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () =>
      reject(new Error("Could not read that image. Please try another file."));
    reader.readAsDataURL(blob);
  });
const loadImage = (source) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(
        new Error(
          "Could not open that image. Please use a valid PNG, JPG, or WebP.",
        ),
      );
    image.src = source;
  });
$("logo").addEventListener("change", async () => {
  const file = $("logo").files[0];
  if (!file) return;
  const version = ++logoVersion;
  $("logo-feedback").textContent = "Preparing your logo…";
  try {
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type))
      throw new Error("Choose a PNG, JPG, or WebP image.");
    if (file.size > 1024 * 1024)
      throw new Error("Your logo is too large. Choose a file under 1 MB.");
    const image = await loadImage(await blobToDataURL(file));
    if (image.naturalWidth > 8192 || image.naturalHeight > 8192)
      throw new Error("Choose a logo smaller than 8,192 pixels on each side.");
    // Normalize to a small self-contained PNG. This also strips image metadata.
    const canvas = document.createElement("canvas");
    const scale = Math.min(
      1,
      192 / Math.max(image.naturalWidth, image.naturalHeight),
    );
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
    if (version !== logoVersion) return;
    state.settings.logo = canvas.toDataURL("image/png");
    syncSettings();
    $("logo-label").textContent = file.name;
    $("logo-feedback").textContent =
      "Logo added. Always test a scan before printing or sharing.";
    schedulePreview(true);
  } catch (error) {
    if (version === logoVersion) $("logo-feedback").textContent = error.message;
  } finally {
    if (version === logoVersion) $("logo").value = "";
  }
});

async function download(extension) {
  const active = currentQR;
  if (!active || busy) return;
  busy = true;
  updateActions();
  try {
    const qr = new QRCodeStyling(
      qrOptions(active.data, active.saved.settings, active.saved.settings.size),
    );
    const blob = await qr.getRawData(extension);
    if (!blob) throw new Error("Export could not be created.");
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `qode-${active.saved.type}.${extension}`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    notify(
      `${extension.toUpperCase()} downloaded. Give it a quick test scan before sharing.`,
    );
  } catch {
    notify("Download failed. Try again, or remove your logo.");
  } finally {
    busy = false;
    updateActions();
  }
}
$("download-png").addEventListener("click", () => void download("png"));
$("download-svg").addEventListener("click", () => void download("svg"));

function persistHistory(next) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  } catch {
    throw new Error(
      "Could not save changes. Browser storage may be full or unavailable. Delete older codes or allow site storage.",
    );
  }
  history = next;
  renderHistory();
}
$("save-code").addEventListener("click", async () => {
  const active = currentQR;
  if (!active || busy) return;
  if (history.length >= 24) {
    notify(
      "Your collection holds 24 codes. Delete an older code to save another.",
    );
    return;
  }
  busy = true;
  updateActions();
  try {
    const qr = new QRCodeStyling(qrOptions(active.data, active.saved.settings));
    // Rasterize at full resolution before making a small history thumbnail.
    const image = await loadImage(
      await blobToDataURL(await qr.getRawData("png")),
    );
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 192;
    canvas.getContext("2d").drawImage(image, 0, 0, 192, 192);
    const thumbnail = canvas.toDataURL("image/png");
    const entry = {
      ...active.saved,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      thumbnail,
    };
    persistHistory([entry, ...history]);
    notify("Saved to your collection on this device.");
  } catch (error) {
    notify(error.message || "Could not save this code. Please try again.");
  } finally {
    busy = false;
    updateActions();
  }
});
function renderHistory() {
  $("history-list").replaceChildren();
  $("history-empty").hidden = history.length > 0;
  $("history-count").textContent =
    `${history.length} ${history.length === 1 ? "code" : "codes"}`;
  $("nav-count").textContent = history.length;
  for (const entry of history) {
    const card = document.createElement("article");
    card.className = "history-card";
    const thumb = document.createElement("div");
    thumb.className = "history-thumbnail";
    if (entry.thumbnail) {
      const image = document.createElement("img");
      image.src = entry.thumbnail;
      image.alt = "";
      image.loading = "lazy";
      thumb.append(image);
    } else thumb.textContent = "▦";
    const info = document.createElement("div");
    info.className = "history-card-content";
    const label = document.createElement("span");
    label.className = "history-type";
    label.textContent = TYPE_LABELS[entry.type].toUpperCase();
    const title = document.createElement("h3");
    title.textContent = codeTitle(entry.type, entry.fields);
    title.title = title.textContent;
    const date = document.createElement("p");
    date.textContent = new Date(entry.createdAt).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    info.append(label, title, date);
    const actions = document.createElement("div");
    actions.className = "history-actions";
    const open = document.createElement("button");
    open.type = "button";
    open.textContent = "Open";
    open.setAttribute("aria-label", `Open ${title.textContent}`);
    open.addEventListener("click", () => {
      ++logoVersion;
      for (const [key, value] of Object.entries(entry.fields)) {
        $(key).value = value;
      }
      state.settings = { ...entry.settings };
      $("logo").value = "";
      $("logo-feedback").textContent = "";
      syncSettings();
      selectType(entry.type);
      $("create").scrollIntoView({
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
      });
      $(`${entry.type}-tab`).focus({ preventScroll: true });
      notify("Saved code opened. Make it yours again.");
    });
    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "Delete";
    remove.setAttribute("aria-label", `Delete ${title.textContent}`);
    remove.addEventListener("click", () => {
      try {
        persistHistory(history.filter((item) => item.id !== entry.id));
        notify("Code deleted from this device.");
      } catch (error) {
        notify(error.message);
      }
    });
    actions.append(open, remove);
    card.append(thumb, info, actions);
    $("history-list").append(card);
  }
}
try {
  history = readHistory(localStorage.getItem(HISTORY_KEY));
} catch {
  notify(
    "Saved history could not be loaded. You can still create and download QR codes.",
  );
}
window.addEventListener("storage", (event) => {
  if (event.key !== HISTORY_KEY && event.key !== null) return;
  try {
    history = readHistory(localStorage.getItem(HISTORY_KEY));
    renderHistory();
  } catch {
    notify("Could not refresh saved history.");
  }
});
syncSettings();
renderHistory();
schedulePreview(true);
