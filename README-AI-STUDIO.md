# GenieEngine Web — Google AI Studio edition

This repository now has a browser-based companion edition intended for Google AI Studio Build mode and Cloud Run. The original Electron desktop application remains in the repository; its packaging commands are available as `npm run desktop:dev`, `npm run desktop:build`, and `npm run desktop:dist`.

## Run the web edition

- Node.js 20 or newer
- `npm install`
- Add `GEMINI_API_KEY` to the server environment
- `npm run dev`

The web app uses React + Vite. `server.mjs` serves the app and exposes a server-side `POST /api/generate` endpoint. The Gemini key is read only from the server environment and is never sent to the browser.

## Google AI Studio

1. Open Google AI Studio and choose **Build**.
2. Use **Add files (+) → Import from GitHub** and select `uf-o/GenieEngine`, branch `google-ai-studio`.
3. If prompted, ask the Build agent to preserve the existing React/Vite entry point and run the app with `npm run dev`.
4. Add `GEMINI_API_KEY` in the server-side Secrets panel if AI Studio has not injected it automatically.
5. Test the chat, generate a self-contained HTML prototype, use Preview/Code, and export the prototype HTML.
6. When the preview is working, use **Publish** in AI Studio to deploy to Cloud Run.

## Important scope

This is a web prototype, not a full browser port of the native desktop engine. The desktop app's embedded Godot runtime, local OpenCode CLI, native Git integration, asset-generation providers, and six-platform game export are not automatically available inside a browser. The web edition offers a Gemini-powered game-design assistant and an isolated HTML prototype preview. Generated HTML is sandboxed in an iframe and should still be reviewed before use.

## Desktop commands

The desktop packaging scripts remain separate. Desktop setup requires the native/vendor setup steps and platform-specific dependencies; run `npm run setup` in a desktop development environment.
