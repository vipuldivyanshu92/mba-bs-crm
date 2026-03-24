# WarmIntro — Skills & Technologies

## Frontend
- **React 18** with TypeScript
- **Vite** for fast builds and HMR
- **Tailwind CSS** with custom design tokens (navy/slate palette)
- **shadcn/ui** component library (Radix UI primitives)
- **Framer Motion** for animations
- **React Router v6** for client-side routing
- **TanStack React Query** for server-state management
- **React Hook Form + Zod** for form validation
- **Recharts** for data visualization
- **Lucide React** for iconography

## Backend (Lovable Cloud)
- **Supabase** (PostgreSQL) for database and authentication
- **Row Level Security (RLS)** for data protection
- **Edge Functions** (Deno runtime) for serverless logic
- **Realtime subscriptions** for live data updates

## AI Integration
- **Lovable AI** (via Edge Functions) for:
  - Meeting note summarization
  - Personalized message drafting (thank-yous, follow-ups, outreach)

## Authentication
- Email/password signup and login
- Session management via Supabase Auth
- Protected routes with auth context

## Database Schema
- `profiles` — user onboarding data (school, graduation year, targets)
- `contacts` — networking CRM with relationship tracking
- `companies` — recruiting pipeline with stage management
- `meetings` — coffee chat and event logs with AI summaries
- `follow_ups` — reminder system with snooze support
- `drafted_messages` — AI-generated outreach drafts

## Design System
- Custom HSL color tokens (navy, slate, warm accents)
- Inter font family
- Semantic Tailwind classes via `index.css` and `tailwind.config.ts`
- Light/dark mode support via CSS variables

## Dev Tooling
- **ESLint** with React hooks and refresh plugins
- **Vitest** for unit testing
- **Playwright** for end-to-end testing
- **TypeScript** strict mode
