# Waypoint RPG

**An AI Dungeon Master that never forgets.**

Waypoint is an AI-powered tabletop RPG where Gemini 3 acts as a true Dungeon Master. Six specialized agents orchestrate gameplay with 1M token memory, function calling, and deterministic game mechanics.

🎮 [Play Now](https://waypoint.amllamojha.com) · 📺 [Demo Video](https://youtu.be/vL28J1Fe_Cw)

![Waypoint Screenshot](https://d112y698adiu2z.cloudfront.net/photos/production/software_photos/004/251/918/datas/original.png)

## Features

- **6 Gemini 3 Agents** — Multi-agent orchestration (Rune Marshal, Orchestrator, Arbiter, Lorekeeper, Chronicler, Content Sentinel)
- **1M Token Memory** — Complete narrative history, never forgets
- **15+ Function Declarations** — Schema-enforced outputs, no hallucinations
- **Hybrid Architecture** — LLM proposes, code validates
- **Real Dice Rolls** — Server-side d20 mechanics, not LLM-generated
- **Persistent World** — Inventory, relationships, quests tracked in database

## Architecture

```
Player Input → Content Sentinel → Rune Marshal → Orchestrator
                                                      │
                                              ┌───────┴───────┐
                                              ▼               ▼
                                          Arbiter       Lorekeeper
                                              │               │
                                              └───────┬───────┘
                                                      ▼
                                              Apply State (DB)
                                                      │
                                                      ▼
                                                Chronicler → UI
```

## Tech Stack

- **AI**: Gemini 3 via `@google/genai` SDK
- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes (Edge + Serverless)
- **Database**: Supabase (PostgreSQL + Auth + RLS)
- **Streaming**: Server-Sent Events (SSE)

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase account
- Gemini API key

### Installation

```bash
git clone https://github.com/amllamojha/waypoint-rpg.git
cd waypoint-rpg
npm install
```

### Configuration

Copy the example environment file:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GEMINI_API_KEY=your-gemini-api-key
```

### Database Setup

Run the migrations in `supabase/migrations/` against your Supabase project.

### Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
waypoint-rpg/
├── app/                    # Next.js app router
│   └── api/               # API routes (turn, dm-chat, auth)
├── components/            # React UI components
├── lib/
│   ├── agents/            # Gemini agent implementations
│   │   ├── orchestrator.ts
│   │   ├── rune-marshal.ts
│   │   ├── lorekeeper/
│   │   └── tools/         # Function declarations
│   ├── mechanics/         # Dice, skills, combat
│   ├── rules/             # Validation rules
│   └── supabase/          # Database client
├── constants.ts           # Game data (skills, locations, NPCs)
└── types.ts               # TypeScript types
```

## How It Works

1. **Player types an action** — "I try to sneak past the guards"
2. **Rune Marshal** detects intent and skill requirements
3. **Orchestrator** proposes events via function calling
4. **Arbiter** validates proposals against game rules
5. **Lorekeeper** fetches relevant world knowledge
6. **Server rolls dice** — d20 + modifiers (deterministic)
7. **Chronicler** streams vivid narration
8. **UI updates** with validated state changes

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

[MIT](LICENSE)

## Acknowledgments

Built for the [Gemini 3 Hackathon](https://gemini3.devpost.com/) on Devpost.
