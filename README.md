# Home Sweet Home · 3D Studio

A web viewer for exploring the home's architecture, lighting and decor in 3D. Built with React, TypeScript, Vite and Three.js/WebGL. The interface is in English.

- 3D, floor plan, front and pool views, plus an indoor walkthrough with ceilings.
- Day/Night lighting and room isolation.
- Office, open-air winter garden, guest bedroom and powder rooms with revised access.
- Kitchen island with an open seating side and three wood stools with moss-green upholstery.
- Black 2022 Tiggo 5x Turbo and blue Volvo EX30 modeled from references.
- Furniture editing by coordinates, browser storage, and JSON import/export.

## Run locally

Use **Node.js 24** (specified in `.nvmrc`).

```bash
npm ci
npm run dev
```

Open the URL printed by Vite, usually `http://localhost:5173/`.

## Validate and build

```bash
npm test
npm run check:model
npm run build
```

`npm run check:layout` checks furniture clearances and circulation. The production build is generated in `dist/`.

## Deploy to Vercel

Import this repository with these settings:

| Setting | Value |
| --- | --- |
| Root Directory | Repository root (`./`) |
| Framework | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Node.js | 24.x |

`vercel.json` defines the framework, build command and output directory. The app uses static files and requires no environment variables.

## Model and data

`src/architecture.json` stores shared dimensions. `gerar-modelo.mjs` generates the base JSON files and a Collada architecture export:

```bash
node gerar-modelo.mjs
```

The output includes `casa-modelo.json`, `public/casa-modelo.json` and `Casa-Indaiatuba.dae`. Furniture and finish details are built as 3D geometry in the browser.

Saved decor is stored locally in each browser. Use **Export JSON** and **Open project** to transfer a composition to another device. Downloads are named `home-studio.json`.

`src/labels.ts` provides English display names for the original model objects and furniture. Internal names and storage keys remain stable so existing projects and geometry matching keep working; custom names are preserved.

The original Portuguese reference notes, measurement estimates and modeling decisions are in [LEVANTAMENTO.md](./LEVANTAMENTO.md). The development history and performance measurements are in [LEIA-ME.md](./LEIA-ME.md).
