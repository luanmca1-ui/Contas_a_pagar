# Resumo 2025 (DRE)

Dashboard financeiro clean e responsivo com fallback automático para Netlify Functions.

## Rodar local

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Deploy no Netlify

1. Conecte o repositório no Netlify ou arraste a pasta `dist` após o build.
2. O `netlify.toml` já define `publish` e `functions`.

A função `/.netlify/functions/summary` é usada automaticamente se o CSV direto falhar.
