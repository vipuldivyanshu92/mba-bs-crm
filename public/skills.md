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
- **Row Level Security (RLS)** for data protection — all tables enforce `auth.uid() = user_id`
- **Edge Functions** (Deno runtime) for serverless AI logic
- **Realtime subscriptions** for live data updates

## AI Integration
- **Lovable AI Gateway** (`https://ai.gateway.lovable.dev/v1/chat/completions`)
- Model: `google/gemini-3-flash-preview`
- Auth: `LOVABLE_API_KEY` (server-side secret)
- Two Edge Functions:
  - `summarize-notes` — structured meeting note summarization via tool calling
  - `draft-message` — personalized message drafting (thank-you, follow-up, check-in, alumni outreach)

## Authentication
- Email/password signup and login via Supabase Auth
- Auto-confirm email enabled
- Session management via `AuthContext` (`useAuth()` hook)
- Protected routes: `ProtectedRoute`, `AuthRoute`, `OnboardingRoute`
- New user trigger: `handle_new_user()` auto-creates a profile row on signup

---

## Database Schema

### `profiles`
| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | References `auth.users.id` |
| full_name | text | |
| school | text | MBA program name |
| graduation_year | integer | |
| target_industries | text[] | |
| target_companies | text[] | |
| onboarding_completed | boolean | Default `false` |
| created_at / updated_at | timestamptz | |

**RLS**: SELECT, INSERT, UPDATE by own user. No DELETE.

### `contacts`
| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| user_id | uuid | Owner |
| full_name | text | Required |
| role_title | text | |
| company | text | |
| email | text | |
| linkedin_url | text | |
| school_alumni_status | text | e.g. "Kellogg '22" |
| relationship_strength | enum | `cold` / `warm` / `strong` |
| tags | text[] | e.g. `['consulting', 'alumni']` |
| last_interaction_date | date | |
| next_followup_date | date | |
| notes | text | |
| shared_interests | text | |
| created_at / updated_at | timestamptz | |

**RLS**: Full CRUD by own user.

### `companies`
| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| user_id | uuid | Owner |
| name | text | Required |
| stage | enum | `interested` → `reached_out` → `coffee_chat_completed` → `applied` → `interviewing` → `offer` → `closed` |
| why_interested | text | |
| interview_timeline | text | |
| notes | text | |
| created_at / updated_at | timestamptz | |

**RLS**: Full CRUD by own user.

### `meetings`
| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| user_id | uuid | Owner |
| contact_id | uuid (FK → contacts) | |
| date | date | |
| meeting_type | enum | `coffee_chat` / `info_interview` / `networking_event` / `class_project` / `alumni_call` |
| raw_notes | text | User's raw meeting notes |
| key_takeaways | text | Summarized or manual |
| promised_next_steps | text | |
| followup_date | date | |
| sent_thank_you | boolean | Default `false` |
| structured_summary | jsonb | AI-generated structured summary |
| created_at | timestamptz | |

**RLS**: Full CRUD by own user.

### `follow_ups`
| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| user_id | uuid | Owner |
| contact_id | uuid (FK → contacts) | |
| due_date | date | |
| description | text | |
| status | enum | `pending` / `completed` / `snoozed` |
| snoozed_until | date | |
| completed_at | timestamptz | |
| created_at | timestamptz | |

**RLS**: Full CRUD by own user.

### `drafted_messages`
| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| user_id | uuid | Owner |
| contact_id | uuid (FK → contacts) | Optional |
| message_type | enum | `thank_you` / `follow_up` / `check_in` / `alumni_outreach` |
| content | text | AI-generated or edited message body |
| subject | text | Optional |
| created_at | timestamptz | |

**RLS**: Full CRUD by own user.

---

## API Calls (Supabase Client)

All API calls use `supabase` client from `@/integrations/supabase/client`.

### Contacts
```ts
// List contacts (ordered by most recent)
supabase.from('contacts').select('*').eq('user_id', user.id).order('updated_at', { ascending: false })

// Get single contact
supabase.from('contacts').select('*').eq('id', id).eq('user_id', user.id).single()

// Insert contact
supabase.from('contacts').insert({ user_id, full_name, role_title, company, email, linkedin_url, school_alumni_status, relationship_strength, tags, notes, shared_interests })

// Update contact
supabase.from('contacts').update({ full_name, role_title, company, ... }).eq('id', contactId)

// Delete contact
supabase.from('contacts').delete().eq('id', contactId)
```

### Companies
```ts
// List companies
supabase.from('companies').select('*').eq('user_id', user.id).order('created_at', { ascending: false })

// Insert company
supabase.from('companies').insert({ user_id, name, stage, why_interested, interview_timeline })

// Update stage
supabase.from('companies').update({ stage }).eq('id', companyId)

// Delete company
supabase.from('companies').delete().eq('id', companyId)
```

### Meetings
```ts
// List meetings for a contact
supabase.from('meetings').select('*').eq('contact_id', id).eq('user_id', user.id).order('date', { ascending: false })

// Insert meeting (also updates contact and optionally creates follow-up)
supabase.from('meetings').insert({ user_id, contact_id, date, meeting_type, raw_notes, key_takeaways, promised_next_steps, followup_date, sent_thank_you })
```

### Follow-ups
```ts
// List pending follow-ups with contact info
supabase.from('follow_ups').select('*, contacts(id, full_name, company)').eq('user_id', user.id).eq('status', 'pending').order('due_date', { ascending: true })

// Mark complete
supabase.from('follow_ups').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', followUpId)

// Snooze (move due date forward)
supabase.from('follow_ups').update({ due_date: newDate, snoozed_until: newDate }).eq('id', followUpId)

// Insert follow-up (from Log Meeting flow)
supabase.from('follow_ups').insert({ user_id, contact_id, due_date, description })
```

### Drafted Messages
```ts
// List messages with contact join
supabase.from('drafted_messages').select('*, contacts(full_name, company)').eq('user_id', user.id).order('created_at', { ascending: false })

// Save draft
supabase.from('drafted_messages').insert({ user_id, contact_id, message_type, content })

// Delete draft
supabase.from('drafted_messages').delete().eq('id', messageId)
```

### Profile
```ts
// Get profile
supabase.from('profiles').select('*').eq('id', user.id).single()

// Update profile (Settings + Onboarding)
supabase.from('profiles').update({ full_name, school, graduation_year, target_industries, target_companies, onboarding_completed }).eq('id', user.id)
```

---

## Edge Functions (AI)

### `POST /functions/v1/summarize-notes`
Summarizes raw meeting notes into structured JSON using AI tool calling.

**Request body:**
```json
{
  "notes": "string — raw meeting notes",
  "meetingType": "string — e.g. 'coffee_chat'"
}
```

**Response (200):**
```json
{
  "summary": {
    "what_was_discussed": "string",
    "advice_received": "string",
    "opportunities_mentioned": "string",
    "personal_details": "string",
    "best_next_step": "string",
    "key_takeaways": "string (required)",
    "next_steps": "string (required)"
  }
}
```

**Error responses:** `429` (rate limited), `402` (credits needed), `500` (server error)

**Client invocation:**
```ts
supabase.functions.invoke('summarize-notes', { body: { notes, meetingType } })
```

---

### `POST /functions/v1/draft-message`
Generates a personalized message draft for a contact.

**Request body:**
```json
{
  "contactName": "string",
  "contactCompany": "string",
  "contactRole": "string",
  "messageType": "thank_you | follow_up | check_in | alumni_outreach",
  "context": "string (optional) — additional context"
}
```

**Response (200):**
```json
{
  "message": "string — the generated email body"
}
```

**Error responses:** `429` (rate limited), `402` (credits needed), `500` (server error)

**Client invocation:**
```ts
supabase.functions.invoke('draft-message', {
  body: { contactName, contactCompany, contactRole, messageType, context }
})
```

---

## Pages & Routes

| Route | Component | Auth | Description |
|---|---|---|---|
| `/auth` | `Auth` | Public (redirects if logged in) | Sign up / sign in |
| `/onboarding` | `Onboarding` | Requires auth, no onboarding complete | Collects school, graduation year, targets |
| `/` | `Dashboard` | Protected | Stats, today's follow-ups, recent contacts, pipeline summary |
| `/contacts` | `Contacts` | Protected | Searchable contact list with filters & sorting |
| `/contacts/:id` | `ContactDetail` | Protected | Contact profile, meeting timeline, follow-ups, messages |
| `/companies` | `Companies` | Protected | Kanban pipeline board (7 stages) |
| `/reminders` | `Reminders` | Protected | Follow-up management with snooze & complete |
| `/messages` | `Messages` | Protected | AI-drafted messages, generate & save drafts |
| `/settings` | `Settings` | Protected | Profile editing |
| `*` | `NotFound` | Public | 404 page |

---

## Key Workflows

### Log Meeting (under 30 seconds)
1. Click "Log Meeting" button (sidebar or mobile header)
2. Select contact, date, meeting type
3. Paste raw notes → click "Summarize with AI" (optional)
4. Set follow-up date → Save
5. System auto-creates: meeting record, updates contact's last interaction, creates follow-up reminder

### Draft Message
1. Go to Messages → click "Draft Message"
2. Select contact and message type
3. Optionally add context
4. Click "Generate Draft" → AI creates personalized email
5. Edit and save, or copy to clipboard

---

## Design System
- Custom HSL color tokens (navy, slate, warm accents)
- Inter font family
- Semantic Tailwind classes via `index.css` and `tailwind.config.ts`
- Light/dark mode support via CSS variables
- Consistent card patterns with `border-border/50` styling

## Dev Tooling
- **ESLint** with React hooks and refresh plugins
- **Vitest** for unit testing
- **Playwright** for end-to-end testing
- **TypeScript** strict mode
