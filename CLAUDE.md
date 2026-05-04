# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Critical: Next.js version

This project uses **Next.js 16.2.4 with React 19.2.4**. APIs, conventions, and file structure differ from older Next.js versions in your training data. Before writing any Next.js code (routing, data fetching, caching, server actions, middleware, config), consult the local docs at `node_modules/next/dist/docs/` — particularly `01-app/` for App Router and `03-architecture/` for runtime/build details. Heed deprecation notices in those docs.

## Commands

```bash
npm run dev      # start dev server (http://localhost:3000)
npm run build    # production build
npm run start    # serve the production build
npm run lint     # eslint (uses eslint-config-next core-web-vitals + typescript)
```

There is no test runner configured.

## Project shape

- **App Router only.** Source lives under `src/app/`. The path alias `@/*` resolves to `./src/*` (see `tsconfig.json`).
- **React Compiler is enabled** (`reactCompiler: true` in `next.config.ts`, with `babel-plugin-react-compiler`). Avoid hand-rolled `useMemo`/`useCallback`/`memo` unless the compiler genuinely cannot optimize the case — let the compiler do its job.
- **TypeScript strict mode** is on. Per Endare standards, always declare explicit parameter and return types.

## Vercel platform notes

The session loads Vercel-specific guidance (Fluid Compute, AI Gateway, etc.). Only apply that guidance when the task actually involves deployment, server functions, or platform features — do not push platform migrations into unrelated work.
