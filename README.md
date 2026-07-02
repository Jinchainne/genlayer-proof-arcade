# GenLayer Proof Arcade

GenLayer Proof Arcade is a dark Web3 prediction and judgment dashboard built as an MVP frontend for fast rounds, AI-assisted dispute games, and points-based arcade loops.

## Highlights

- Race board with six outcome zones: Crash, Dump, Lower, Higher, Pump, Moon
- Sidebar game modes for Build, Doc Hunt, News Pulse, Judge, Flip, Roll, and Spin
- Lite / Pro mode switch with mocked evidence and resolution rules
- Auto-sign toggle for MVP test flow
- Mocked round entry, positions table, balances, and leaderboard preview

## Stack

- Next.js 14
- React 18
- TypeScript
- lucide-react

## Local development

```bash
npm install
npm run dev
```

## Scripts

```bash
npm run typecheck
npm run build
```

## Future GenLayer interface

The UI already reserves the intended contract calls for later integration:

- `create_round(question, choices, resolution_rules, start_time, lock_time, end_time)`
- `enter_round(round_id, choice, points)`
- `resolve_round(round_id)`
- `claim_reward(round_id)`
