# 🎮 GenLayer Proof Arcade

An AI-powered prediction arcade built on GenLayer Intelligent Contracts.

> An experimental AI-native prediction market demonstrating how GenLayer Intelligent Contracts can resolve subjective real-world outcomes using validator consensus and web evidence.

## 🌐 Live Demo

https://genlayer-proof-arcade.vercel.app/

## 📦 Repository

https://github.com/Jinchainne/genlayer-proof-arcade

---

## Overview

GenLayer Proof Arcade is an experimental prediction platform that combines prediction markets, AI-assisted judgement, validator consensus, Intelligent Contracts, and real-world evidence verification.

Instead of relying on a single centralized oracle, outcomes are resolved through a GenLayer Intelligent Contract that fetches public evidence URLs during `resolve_round`, asks validators to independently adjudicate the round, and only accepts a verdict when consensus converges on the same winning choice.

This project demonstrates how GenLayer can be used to build AI-native blockchain applications that reason about real-world events.

---

## Features

### 🎮 Prediction Rounds

Users can create and participate in prediction rounds based on real-world events, such as:

- BTC price movement
- Sports results
- AI benchmark competitions
- Community events
- Crypto ecosystem milestones

### 🤖 AI-Assisted Resolution

Prediction outcomes are resolved through AI-assisted judgement using GenLayer validators.

The contract now:

- stores evidence URLs on round creation
- fetches live public evidence during `resolve_round`
- runs non-deterministic adjudication through GenLayer validator consensus
- stores the winning choice, confidence, and evidence summary onchain

### 📡 Evidence-Based Verification

The platform can use public evidence sources such as:

- News articles
- Public APIs
- Market data
- GitHub activity
- Official announcements
- Community evidence

### 👛 Wallet Integration

Users can connect their wallet, join prediction rounds, track positions, and claim rewards.

### 📊 Market Dashboard

The dashboard displays active markets, round status, resolution progress, participation data, and market history.

---

## Tech Stack

### Frontend

- Next.js
- TypeScript
- TailwindCSS
- shadcn/ui

### Blockchain

- GenLayer Studionet
- Intelligent Contracts
- GenLayerJS SDK

### Infrastructure

- Vercel
- GitHub

### Data Sources

- Public APIs
- Crypto market feeds
- RSS feeds
- Web evidence sources

---

## Architecture

```text
User
 │
 ▼
Frontend Application
 │
 ▼
GenLayer Intelligent Contract
 │
 ├── Fetch public evidence URLs
 ├── Ask validators to adjudicate the round
 └── Accept consensus winning choice
 ▼
AI Validators
 │
 ├── GPT-based Validators
 ├── Llama-based Validators
 ├── Mistral-based Validators
 └── Other LLM Validators
 │
 ▼
Consensus Result
 │
 ▼
Prediction Resolution
