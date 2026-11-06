# qode - QR Code Generator

A simple, customizable QR code generator that runs entirely in your browser.

Create QR codes for websites, text, and contact information. Customize their appearance, add your own logo, and download them in high quality - no account required.

**[Try qode online](https://e-kai00.github.io/qr-generator/)**

## Features

- **Multiple QR types** — Generate QR codes for URLs, plain text, and contact information.
- **Custom designs** — Choose colors and switch between Classic, Rounded, and Dots styles.
- **Logo support** — Upload your own image to personalize your QR code.
- **Live preview** — See changes as you customize your code.
- **High-quality downloads** — Export as PNG (512, 1024, or 2048px) or SVG.
- **Saved collection** — Save, reopen, and delete up to 24 QR codes.
- **Privacy-friendly** — QR generation happens directly in your browser.
- **Responsive design** — Works on desktop and mobile devices.

## Getting Started

### Requirements

- [Node.js](https://nodejs.org/) 22.12 or newer
- npm

### Installation

Clone the repository:

`git clone https://github.com/e-kai00/qr-generator.git`

Navigate to the project:

`cd qr-generator`

Install dependencies:

`npm install`

Start the development server:

`npm run dev`

Open the local URL displayed in your terminal, usually `http://localhost:5173/`.

### Available Commands

| Command | Description |
|---|---|
| `npm run dev` | Start the local development server |
| `npm test` | Run automated tests |
| `npm run build` | Create an optimized production build |
| `npm run preview` | Preview the production build locally |

## How to Use

1. **Choose a QR type** — Website, Text, or Contact.
2. **Enter your content** — Add the information you want to encode.
3. **Customize your QR code** — Select colors, patterns, and an optional logo.
4. **Preview the result** — Your QR code updates automatically.
5. **Download or save** — Export as PNG/SVG or add it to your saved collection.

For best results, use contrasting colors and test your downloaded QR code with a phone before printing or sharing it.

## Tech Stack
- HTML
- CSS
JavaScript
- [qr-code-styling](https://github.com/kozakdenys/qr-code-styling)
- [Vite](https://vite.dev/) 

## Deployment

The application is deployed to **GitHub Pages** using GitHub Actions.

Every push to the `main` branch automatically:

1. Installs project dependencies.
2. Runs automated tests.
3. Builds the application with Vite.
4. Deploys the production files to GitHub Pages.

The deployment workflow is defined in `.github/workflows/deploy.yml`.

## AI-Assisted Development

This project was built with the assistance of [OpenAI Codex CLI](https://openai.com/codex), an AI coding agent used for code generation, UI development, refactoring, testing, and deployment configuration.
Project requirements, design decisions, and development direction were guided by the project maintainer.
