# QR Studio

A responsive QR code generator built with plain HTML, CSS, and JavaScript. Everything runs in the browser: no backend, account, database, or paid QR service.

## Run locally

Install [Node.js](https://nodejs.org/) **22.12 or newer** (Node 24 LTS also works), then run these commands in the project folder:

```sh
npm install
npm run dev
```

Open the local URL printed by Vite, usually **http://127.0.0.1:5173**. Keep that terminal running while you use the app. Press `Ctrl+C` to stop it.

An internet connection is needed to install the dependencies. Do not open `index.html` directly: Vite resolves and bundles the JavaScript library imports.

## Use the app

1. Choose **Website**, **Text**, or **Contact**.
2. Enter your content. Website links need `http://` or `https://`. Contacts need at least a first or last name; other contact details are optional.
3. Pick a code color, a background, and Classic, Rounded, or Dots styling. Low-contrast or inverted color combinations are blocked.
4. Optionally upload a PNG, JPG, or WebP logo under 1 MB. The app resizes it to at most 192 pixels and embeds it in your code. **Reset** restores the original colors, style, size, and empty logo.
5. Download a **PNG** at 512, 1024, or 2048 pixels, or a scalable **SVG** with an embedded logo.
6. Click **Save to my codes** to keep the current content, customization, logo, and export size in your collection. Use **Open** to restore a saved code or **Delete** to remove it.

The preview updates automatically after a short typing delay. Empty or invalid content clears the preview and disables save and download actions. All codes are static: the encoded content cannot be changed after a code is printed. Create a new code when your content changes.

## Saved data and privacy

- History is stored in `localStorage` under `qr-studio.history.v1`. Nothing is sent to a server for QR generation, image processing, or storage.
- Saving is explicit. Unsaved form changes are not persisted. Only the selected content type is saved; fields from other tabs are excluded.
- A collection holds up to 24 codes. A full collection or unavailable/full browser storage produces a message; the app does not silently discard old codes.
- Saved contact details are readable in browser storage. Save them only on a trusted device. The thumbnails also encode the saved data.
- History belongs to the browser and origin (protocol, hostname, and port), so changing the local port or using another browser gives you a separate collection. Clearing site data removes it. Other tabs on the same origin refresh when saved data changes.
- The interface uses Google Fonts with system-font fallbacks. Font requests contain no QR content; the app still works if they are blocked. The QR dependency is bundled locally by Vite.

## Scan reliability

The app uses error correction level **H**, square finder markers, dark-on-light colors with at least a **4.5:1** luminance contrast ratio, and a quiet zone of at least four modules. Logo coverage is conservatively limited; logos never replace finder markers. PNG and SVG exports use the same content and styling as the preview.

Content is capped at **1,200 UTF-8 bytes**, including vCard formatting. Emoji and many non-Latin characters use more than one byte. Shorter content creates less dense, easier-to-scan codes. Use the larger PNG sizes or SVG for dense codes and print work. Do not crop the surrounding blank border.

“Ready to scan” means the content and style checks passed; it is not a decoder verification. Always test the downloaded code with a phone camera before sharing or printing, especially after adding a logo. Actual scanning also depends on print size, lighting, the logo, and the scanner. Logos inside SVG exports are embedded raster images; the QR modules remain vector graphics.

## Architecture and files

```text
qr-generator/
├── index.html             # Accessible page structure, forms, and preview
├── public/
│   └── favicon.svg        # Small local brand icon
├── src/
│   ├── main.js            # UI events, live rendering, upload, export, history
│   ├── qr-data.js         # Validation, vCard encoding, storage parsing
│   └── style.css          # Responsive layout and visual styling
├── tests/
│   └── qr-data.test.js    # Native Node tests for payload and storage logic
├── package.json           # Dependencies and development commands
└── .gitignore             # Excludes dependencies and generated output
```

The UI takes a snapshot of the active content and customization, validates it, and passes it to `qr-code-styling`. A small UTF-8 adapter preserves international text in the library’s byte encoder; its internal `qrcode-generator` dependency is pinned to 1.4.4 to keep that behavior predictable. Every edit invalidates the previous preview immediately. Generation uses a version counter to prevent a slower earlier render from replacing newer content. Downloads and saves capture the validated snapshot. Logos are decoded and re-encoded locally as small PNGs before use. Saved content is inserted using `textContent`, and restored storage data is checked before use.

### Dependencies

- **[qr-code-styling 1.9.2](https://github.com/kozakdenys/qr-code-styling)** (MIT): an established QR library that supports module styles, embedded logos, error-correction settings, and both PNG and SVG exports. It uses `qrcode-generator` internally; the app delegates QR encoding and rendering to the library rather than implementing those algorithms.
- **[Vite 7](https://vite.dev/guide/)** (development only): resolves npm imports, provides a fast local server with live reload, and produces static files for hosting. No frontend framework is needed.
- Tests use Node’s built-in `node:test` and `assert` modules, so no testing dependency is required.

## Checks and production build

```sh
npm test
npm run build
npm run preview
```

Tests cover URL validation, Unicode and capacity limits, vCard formatting, contrast restrictions, and malformed/untrusted saved data. JavaScript syntax can also be checked without installing dependencies:

```sh
node --check src/main.js
node --check src/qr-data.js
```

`npm run build` creates **dist/**. Serve that folder with any static web host. `npm run preview` serves the built app locally, usually on port 4173; it is a local verification server, not a production backend.

Recommended browser checks after installation: generate and scan each content type; try all three styles and a logo; open the PNG/SVG exports; save, reload, reopen, and delete history; try blank inputs, low-contrast colors, an invalid logo, and a mobile-width screen.

### Verification in the implementation environment

All seven payload/storage tests, both JavaScript syntax checks, and the production build passed. Browser and scan checks have not been completed here; use the browser checklist above to verify those behaviors.
