# Building and Running Notepad++ Web

## Prerequisites

- Node.js 18+ (Node.js 20 LTS recommended)
- npm

## Install dependencies

```bash
cd web
npm install
```

## Run locally (development)

```bash
cd web
npm run dev
```

Default URL: `http://localhost:3000`

## Create a production build

```bash
cd web
npm run build
```

## Run production build locally

```bash
cd web
npm run start
```

## Lint

```bash
cd web
npm run lint
```

## Notes

- `npm run build` automatically runs language data generation via `prebuild`.
- Language data can also be generated directly with:

```bash
cd web
npm run generate
```
