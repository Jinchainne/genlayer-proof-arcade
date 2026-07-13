# GenLayer Proof Arcade

Live Web3 prediction arcade built around a GenLayer Intelligent Contract that resolves subjective rounds with web evidence and validator consensus.

Live app: https://genlayer-proof-arcade.vercel.app/

Repository: https://github.com/Jinchainne/genlayer-proof-arcade

Studionet contract: `0x7F366CB61Fc3d66b49768C0BdaC53f14d8AC8c4f`

## What makes this a GenLayer project

This project is not using GenLayer as a simple EVM wrapper.

The core contract resolution path is non-deterministic and consensus-backed:

- `create_round(...)` stores the prediction question, allowed choices, resolution rules, and public `evidence_urls`
- `resolve_round(...)` fetches live evidence from the web at execution time
- validators independently run AI-assisted adjudication over that evidence
- the contract accepts the result through GenLayer validator consensus instead of deterministic market-pool logic
- the final onchain state stores `winning_choice`, `confidence`, and `evidence_summary`

That means the outcome depends on live public information and validator reasoning, which is the meaningful GenLayer-specific behavior this project is built to demonstrate.

## Resolver flow

The deployed contract in [contracts/proof_arcade_mvp.py](contracts/proof_arcade_mvp.py) resolves rounds with this pipeline:

1. Load the stored round and its `evidence_urls`.
2. Fetch evidence from the web.
   Dynamic pages such as GitHub issues are rendered as text with `gl.nondet.web.render(..., mode="text")`.
3. Build a resolution prompt from:
   - the round question
   - the allowed choices
   - the resolution rules
   - the fetched evidence bundle
4. Ask the model for structured JSON containing:
   - `winning_choice`
   - `confidence`
   - `evidence_summary`
5. Run that judgment through `gl.vm.run_nondet_unsafe(...)` so validators independently reproduce and compare the result.
6. Persist the consensus-backed verdict onchain.

## Live examples already executed

The current deployed contract has already been tested on Studionet:

- Deploy transaction:
  `0x5d482112675d94f05e5b89debf3fcc6e4c438f36091787dfb248a4a11df9f575`
- Test `create_round` transaction:
  `0xfeaae3e3672b8f59a0d4a0fe1b7294ae28471b73f66a5a1a26046436e1e18877`
- Test `resolve_round` transaction:
  `0x225f7305116f65bc2b38e8c02afcc77d48ab1da273a3f23c05e2f4d4df6bb63b`

Example resolved round state after consensus:

```json
{
  "status": "resolved",
  "winning_choice": "Need more evidence",
  "confidence": 62,
  "evidence_urls": [
    "https://github.com/genlayerlabs/genlayer-studio/issues/1698"
  ]
}
```

## Frontend behavior

The live app is connected to the deployed Studionet contract and exposes:

- wallet-aware round entry
- create / enter / resolve / claim contract actions
- live market and evidence feeds
- contract status and execution mode in the UI
- multiple round types driven by public market, news, document, and GitHub evidence

The production frontend now points at the deployed non-deterministic contract above, so the live app is no longer in session-only mode.

## Project structure

- [contracts/proof_arcade_mvp.py](contracts/proof_arcade_mvp.py): GenLayer Intelligent Contract
- [src/app/page.tsx](src/app/page.tsx): main arcade UI and contract integration
- [src/app/api/live-round/route.ts](src/app/api/live-round/route.ts): live public evidence feeds

## Summary

GenLayer Proof Arcade demonstrates a prediction market where the important step is not a deterministic calculation.

The key project behavior is that round resolution uses:

- live web evidence
- AI-assisted adjudication
- GenLayer validator consensus

That is the part of the app that is specifically built for GenLayer.
