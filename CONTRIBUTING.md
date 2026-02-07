# Contributing to Waypoint RPG

Thanks for your interest in contributing! This project was built for the Gemini 3 Hackathon.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/waypoint-rpg.git`
3. Install dependencies: `npm install`
4. Copy `.env.local.example` to `.env.local` and add your API keys
5. Run locally: `npm run dev`

## Development

### Code Style

- TypeScript strict mode
- Prettier for formatting
- ESLint for linting

### Project Structure

- `lib/agents/` — Gemini agent implementations
- `lib/mechanics/` — Game mechanics (dice, skills, combat)
- `lib/rules/` — Validation rules
- `components/` — React UI components
- `app/api/` — API routes

### Key Principles

1. **LLM Proposes, Code Disposes** — Gemini suggests changes, code validates and applies them
2. **Never Lose Context** — We use the full 1M token window, no summarization
3. **Deterministic Mechanics** — Dice rolls happen server-side, not in the LLM

## Pull Requests

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make your changes
3. Run tests: `npm test`
4. Commit with a clear message
5. Push and open a PR

## Issues

- Use GitHub Issues for bugs and feature requests
- Include reproduction steps for bugs
- Check existing issues before creating new ones

## Questions?

Open an issue or reach out on the Devpost submission page.
