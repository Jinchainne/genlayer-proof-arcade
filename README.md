# GenLayer Proof Arcade

GenLayer Proof Arcade is a live prediction interface built for the GenLayer Builder track. It combines a market-style trading surface, real external data feeds, wallet-aware round entry, and a deployed GenLayer Intelligent Contract on Studionet for round creation and resolution.

## What this project is

Proof Arcade is designed as a GenLayer-native prediction floor for fast judgment games:

- `Race` uses live BTC market data to power lane-based round outcomes
- `News Pulse` uses current crypto headlines as public evidence
- `Build` uses live GenLayer GitHub activity as builder challenge input
- `Judge` uses public issue threads as dispute evidence
- `Doc Hunt`, `Flip`, `Roll`, and `Spin` extend the arcade loop with additional prediction surfaces

The product direction is intentionally positioned between:

- a prediction market browser
- an evidence-aware resolver dashboard
- a GenLayer contract-backed arcade flow

## Live infrastructure

### GenLayer network

- Network: `GenLayer Studio Network`
- Chain ID: `61999`
- RPC: `https://studio.genlayer.com/api`

### Deployed contract

- Contract: `0x5ff368E60E4e49839E6e6B63f0208aFB408d43ae`
- Source: [contracts/proof_arcade_mvp.py](contracts/proof_arcade_mvp.py)

Current contract interface:

- `create_round(question, choices, resolution_rules, start_time, lock_time, end_time)`
- `enter_round(round_id, choice, points)`
- `resolve_round(round_id)`
- `claim_reward(round_id)`

## Product features

- Dark trading-grade UI tailored for GenLayer demos
- Wallet connection with MetaMask / Rabby / OKX detection
- Auto-sign toggle and Lite / Pro display modes
- Category rail and market browser inspired by modern prediction exchanges
- Live data-backed center board and related-market navigation
- Position tracking panel for round submissions
- Evidence and resolution rules panel for GenLayer-oriented judging flows

## Live data sources

The app currently uses real public data sources through API routes:

- Coinbase Exchange market data
- CoinDesk RSS
- Cointelegraph RSS
- GitHub repository and issue data from `genlayerlabs`
- Public trade-policy pages for document-style challenge context

## Project structure

```text
src/app/page.tsx              Main Proof Arcade interface
src/app/globals.css           Global visual system and layout styling
src/app/api/live-round/route.ts
contracts/proof_arcade_mvp.py GenLayer Intelligent Contract MVP
.env.example                  Frontend environment template
```

## Local development

```bash
npm install
npm run dev
```

## Production checks

```bash
npm run typecheck
npm run build
```

## Environment

Create a local environment file from `.env.example`.

```env
NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS=0x5ff368E60E4e49839E6e6B63f0208aFB408d43ae
NEXT_PUBLIC_GENLAYER_NETWORK=studionet
```

## Contract notes

The contract is deployed on Studionet and uses GenLayer-compatible storage types. The frontend is set up to:

- create rounds onchain
- enter rounds with a selected choice and point size
- submit round resolution transactions

This repository keeps the contract intentionally compact so the demo stays easy to inspect during Builder review.

## Why this fits GenLayer

GenLayer is strongest when a product needs:

- structured resolution rules
- public web evidence
- AI-assisted judgment
- contract-visible outcome settlement

Proof Arcade is built around exactly that surface area: market questions, evidence streams, wallet-triggered participation, and an Intelligent Contract that can evolve from MVP pool resolution toward richer GenLayer-native adjudication.

## Status

This is an active Builder submission repo, not a static mockup. The UI, data ingestion, wallet flow, and Studionet contract path are all part of the working demo surface.
