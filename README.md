# IRM — Interventional Radiology EHR

A comprehensive, HIPAA-compliant Electronic Health Record (EHR) and practice
management platform designed specifically for **interventional radiology solo
practitioners**. Clean, minimal, dark.

## Tech Stack

- **Next.js 14** (App Router) + **TypeScript**
- **Tailwind CSS** with a custom dark palette and `0.25rem` sharp radii
- **shadcn/ui-style** primitives built on **Radix UI**
- **Framer Motion** for micro-interactions
- **Recharts** + **D3.js** for charts and visualizations
- **React Hook Form** + **Zod** for form validation
- **XLSX** / **marked** for document workflows
- **Lucide** icons

## Features

- Dashboard with real-time practice analytics, today's appointments, waiting list
- Patients module with enforced 11-field template, XML import validation, duplicate detection
- IR Procedures kanban + timeline with multi-status workflow and auto-appointment sync
- Discharge Reports with AI auto-fill, placeholder normalization (`[F]`, `{{F}}`, `<F>`, `$F`), PDF/TXT export
- Analytics: procedure mix, revenue, referrers, outcome quality metrics
- Archive with long-term storage, retention tracking, restoration
- File Manager with drag-and-drop, template backups, JSON export/import
- Settings: theme accents, practice info, procedure types, HIPAA controls, shortcuts

## Design System

| Token | Value |
| --- | --- |
| Background | `#181614` |
| Foreground | `#FEFEFE` |
| Card | `#23211F` |
| Primary Text (Accent) | `#F96903` |
| Secondary Text (Success) | `#06E575` |
| Warning | `#297DFF` |
| Destructive | `#AC47FC` |
| Border radius | `0.25rem` |

## Getting Started

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Scripts

- `npm run dev` — start dev server
- `npm run build` — production build
- `npm run start` — serve production build
- `npm run lint` — lint with Next.js ESLint config
- `npm run typecheck` — TypeScript project-wide check

## Security

All clinical data is handled with HIPAA-grade controls: AES-256 encryption at
rest and in transit, audit logging, role-based access control, MFA, and 15
minute idle session timeout. This repository contains **mock data only** for
demonstration.

