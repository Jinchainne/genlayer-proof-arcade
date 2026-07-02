"use client";

import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Bot,
  BriefcaseBusiness,
  Coins,
  FileSearch,
  Flame,
  Gavel,
  Gift,
  Layers3,
  Newspaper,
  ScrollText,
  Sparkles,
  Trophy,
  Wallet,
  Zap
} from "lucide-react";

type ChoiceTone = "negative" | "warning" | "positive";

type Choice = {
  label: string;
  tone: ChoiceTone;
};

type GameId = "race" | "build" | "doc-hunt" | "news-pulse" | "judge" | "flip" | "roll" | "spin";

type GameMode = {
  id: GameId;
  label: string;
  asset: string;
  icon: typeof Flame;
  description: string;
  headline: string;
  challenge: string;
  choices: Choice[];
  evidenceHint: string;
};

type PositionEntry = {
  id: string;
  game: string;
  asset: string;
  pick: string;
  size: number;
  status: string;
  time: string;
};

const gameModes: GameMode[] = [
  {
    id: "race",
    label: "Race",
    asset: "BTC",
    icon: Flame,
    description: "Fast BTC judgment rounds with six directional lanes and a locked proof window.",
    headline: "Race board for rapid conviction",
    challenge: "Predict which lane the BTC close settles into when the round resolves.",
    choices: [
      { label: "MOON", tone: "positive" },
      { label: "PUMP", tone: "positive" },
      { label: "HIGHER", tone: "positive" },
      { label: "LOWER", tone: "warning" },
      { label: "DUMP", tone: "negative" },
      { label: "CRASH", tone: "negative" }
    ],
    evidenceHint: "Resolver compares start mark, lock mark, and close mark against the final winning lane."
  },
  {
    id: "build",
    label: "Build",
    asset: "AI",
    icon: Layers3,
    description: "Predict which builder or project satisfies the challenge criteria.",
    headline: "Builder challenge room",
    challenge: "Which builder project best satisfies public demo, shipping speed, measurable output, and clean delivery?",
    choices: [
      { label: "Builder Alpha", tone: "positive" },
      { label: "Builder Beta", tone: "warning" },
      { label: "Builder Gamma", tone: "positive" },
      { label: "Builder Delta", tone: "warning" }
    ],
    evidenceHint: "Public repos, live demos, and challenge result pages define the winning project."
  },
  {
    id: "doc-hunt",
    label: "Doc Hunt",
    asset: "TRADE",
    icon: FileSearch,
    description: "Find discrepancies in trade documents before the timer ends.",
    headline: "Document mismatch sprint",
    challenge: "Sales Contract quantity: 5,000 cartons. Packing List quantity: 4,800 cartons. What is the issue?",
    choices: [
      { label: "Clean", tone: "positive" },
      { label: "Minor discrepancy", tone: "warning" },
      { label: "Major discrepancy", tone: "negative" },
      { label: "Fraud risk", tone: "negative" },
      { label: "Missing document", tone: "warning" }
    ],
    evidenceHint: "Submitted docs, invoice metadata, and shipment records become resolution evidence."
  },
  {
    id: "news-pulse",
    label: "News Pulse",
    asset: "WEB",
    icon: Newspaper,
    description: "Predict whether a Web3 event will be confirmed by public evidence.",
    headline: "Signal versus noise board",
    challenge: "A governance account hints at a token unlock pause. Will public evidence confirm the event within the round window?",
    choices: [
      { label: "Confirmed", tone: "positive" },
      { label: "Not confirmed", tone: "negative" },
      { label: "Bullish", tone: "positive" },
      { label: "Bearish", tone: "warning" }
    ],
    evidenceHint: "Official accounts, protocol blogs, and public URLs become the proof set."
  },
  {
    id: "judge",
    label: "Judge",
    asset: "GEN",
    icon: Gavel,
    description: "AI judge resolves disputes using evidence and structured rules.",
    headline: "Dispute chamber",
    challenge: "Two parties disagree on milestone completion. Which side satisfies the posted delivery checklist?",
    choices: [
      { label: "Claim upheld", tone: "positive" },
      { label: "Claim rejected", tone: "negative" },
      { label: "Need more evidence", tone: "warning" }
    ],
    evidenceHint: "GenLayer will later reason over URLs, documents, and structured dispute rules."
  },
  {
    id: "flip",
    label: "Flip",
    asset: "BTC",
    icon: Coins,
    description: "A quick binary market for fast conviction plays and short timers.",
    headline: "Binary momentum room",
    challenge: "Will BTC print above the session open before the micro round ends?",
    choices: [
      { label: "Heads", tone: "positive" },
      { label: "Tails", tone: "negative" }
    ],
    evidenceHint: "Opening and closing session marks determine the winning side."
  },
  {
    id: "roll",
    label: "Roll",
    asset: "POINTS",
    icon: Gift,
    description: "Risk points on a weighted challenge ladder and collect streak bonuses.",
    headline: "Points ladder",
    challenge: "Choose the lane most likely to hit the daily target band before the roll timer closes.",
    choices: [
      { label: "Safe lane", tone: "positive" },
      { label: "Mid lane", tone: "warning" },
      { label: "High risk lane", tone: "negative" }
    ],
    evidenceHint: "Daily ladder thresholds and score multipliers define the reward tier."
  },
  {
    id: "spin",
    label: "Spin",
    asset: "DAILY",
    icon: Sparkles,
    description: "Daily random challenge to earn points.",
    headline: "Daily spin room",
    challenge: "A rotating prompt drops every day. Pick the best outcome before the spin resolves.",
    choices: [
      { label: "Bonus spin", tone: "positive" },
      { label: "Treasure", tone: "positive" },
      { label: "Try again", tone: "warning" },
      { label: "Miss", tone: "negative" }
    ],
    evidenceHint: "Daily challenge state and the published reward table decide the final result."
  }
];

const tabs = ["Positions", "Perps", "Originals", "Outcomes", "Open Orders", "Balances", "History"] as const;
const navItems = ["Trade", "Arcade", "Portfolio", "Leaderboard", "Earn Points", "Guides"] as const;
const sizes = [1, 10, 50, 100];
const raceZones = [
  { label: "CRASH", accent: "negative", marker: "vvv" },
  { label: "DUMP", accent: "negative", marker: "vv" },
  { label: "LOWER", accent: "warning", marker: "v" },
  { label: "HIGHER", accent: "positive", marker: "^" },
  { label: "PUMP", accent: "positive", marker: "^^" },
  { label: "MOON", accent: "positive", marker: "^^^" }
] as const;

const leaderboardPreview = [
  { rank: "#1", wallet: "0xA12...9f8", points: "1,240 pts" },
  { rank: "#2", wallet: "0xB44...21e", points: "980 pts" },
  { rank: "#3", wallet: "You", points: "200 pts" }
];

// MVP contract interface for later GenLayer integration.
const mvpContractInterface = {
  create_round: "create_round(question, choices, resolution_rules, start_time, lock_time, end_time)",
  enter_round: "enter_round(round_id, choice, points)",
  resolve_round: "resolve_round(round_id)",
  claim_reward: "claim_reward(round_id)"
};

export default function HomePage() {
  const [selectedGame, setSelectedGame] = useState<GameId>("race");
  const [selectedCall, setSelectedCall] = useState("");
  const [selectedSize, setSelectedSize] = useState(10);
  const [autoSign, setAutoSign] = useState(true);
  const [mode, setMode] = useState<"Lite" | "Pro">("Pro");
  const [positions, setPositions] = useState<PositionEntry[]>([]);
  const [roundId, setRoundId] = useState(1);
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>("Positions");
  const [nav, setNav] = useState<(typeof navItems)[number]>("Arcade");

  const activeGame = useMemo(
    () => gameModes.find((game) => game.id === selectedGame) ?? gameModes[0],
    [selectedGame]
  );

  function enterRound() {
    if (!selectedCall) return;
    const currentRound = roundId;
    const stamp = new Date().toLocaleTimeString("en-GB", { hour12: false });
    setPositions((current) => [
      {
        id: `#${String(currentRound).padStart(4, "0")}`,
        game: activeGame.label,
        asset: activeGame.id === "race" ? "BTC/USD" : activeGame.asset,
        pick: selectedCall,
        size: selectedSize,
        status: "Pending resolution",
        time: stamp
      },
      ...current
    ]);
    setRoundId((current) => current + 1);
    setActiveTab("Positions");
  }

  return (
    <main className="arcade-shell">
      <TopNav
        autoSign={autoSign}
        mode={mode}
        nav={nav}
        onNav={setNav}
        onToggleAutoSign={() => setAutoSign((current) => !current)}
        onMode={setMode}
      />

      <section className="arcade-layout">
        <SidebarMenu activeGame={selectedGame} onSelect={setSelectedGame} />

        <section className="arcade-center">
          <GameBoard activeGame={activeGame} mode={mode} />
          <BottomPanel activeTab={activeTab} positions={positions} onTab={setActiveTab} />
        </section>

        <aside className="arcade-right">
          <RoundPanel
            activeGame={activeGame}
            selectedCall={selectedCall}
            selectedSize={selectedSize}
            onSelectCall={setSelectedCall}
            onSelectSize={setSelectedSize}
            onEnterRound={enterRound}
          />
          <BalanceCard />
          <SideLeaderboard />
        </aside>
      </section>
    </main>
  );
}

function TopNav({
  autoSign,
  mode,
  nav,
  onNav,
  onToggleAutoSign,
  onMode
}: {
  autoSign: boolean;
  mode: "Lite" | "Pro";
  nav: (typeof navItems)[number];
  onNav: (value: (typeof navItems)[number]) => void;
  onToggleAutoSign: () => void;
  onMode: (value: "Lite" | "Pro") => void;
}) {
  return (
    <header className="arcade-topbar">
      <div className="arcade-brand">
        <div className="arcade-brand-mark">
          <Zap size={16} />
        </div>
        <div>
          <strong>Proof Arcade</strong>
          <span>GenLayer fast judgment floor</span>
        </div>
      </div>

      <nav className="arcade-nav">
        {navItems.map((item) => (
          <button
            key={item}
            type="button"
            className={item === nav ? "active" : ""}
            onClick={() => onNav(item)}
          >
            {item}
          </button>
        ))}
      </nav>

      <div className="arcade-actions">
        <div className="autosign-box">
          <button
            type="button"
            className={autoSign ? "autosign-toggle active" : "autosign-toggle"}
            onClick={onToggleAutoSign}
            aria-pressed={autoSign}
          >
            <span />
          </button>
          <div>
            <strong>Auto-sign</strong>
            <span>{autoSign ? "Auto-sign enabled for test points only." : "Manual confirmation mode."}</span>
          </div>
        </div>

        <button type="button" className="wallet-chip">
          <Wallet size={14} />
          <span>0xef1...86b6</span>
        </button>

        <div className="mode-switch">
          <button
            type="button"
            className={mode === "Lite" ? "active" : ""}
            onClick={() => onMode("Lite")}
          >
            Lite
          </button>
          <button
            type="button"
            className={mode === "Pro" ? "active" : ""}
            onClick={() => onMode("Pro")}
          >
            Pro
          </button>
        </div>
      </div>
    </header>
  );
}

function SidebarMenu({
  activeGame,
  onSelect
}: {
  activeGame: GameId;
  onSelect: (value: GameId) => void;
}) {
  return (
    <aside className="game-sidebar">
      <div className="section-kicker">Games</div>
      <div className="game-menu">
        {gameModes.map((game) => {
          const Icon = game.icon;
          return (
            <button
              key={game.id}
              type="button"
              className={activeGame === game.id ? "game-menu-item active" : "game-menu-item"}
              onClick={() => onSelect(game.id)}
            >
              <div className="game-menu-left">
                <div className="game-menu-icon">
                  <Icon size={17} />
                </div>
                <span>{game.label}</span>
              </div>
              <em>{game.asset}</em>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

function GameBoard({
  activeGame,
  mode
}: {
  activeGame: GameMode;
  mode: "Lite" | "Pro";
}) {
  const isRace = activeGame.id === "race";

  return (
    <section className="game-stack">
      <article className="game-card race-card">
        <div className="card-head">
          <div>
            <div className="title-line">
              <h1>{activeGame.label}</h1>
              <span className="asset-badge">{activeGame.asset}</span>
            </div>
            <p>{activeGame.description}</p>
          </div>
          <div className="board-status">
            <span>Locked current round</span>
            <strong>Finish in 24s</strong>
          </div>
        </div>

        <div className="progress-rail">
          <div className="progress-fill" />
        </div>

        {isRace ? (
          <div className="race-layout">
            <div className="price-box">
              <span>BTC/USD</span>
              <strong>60,300.23</strong>
              <em>To beat 60,305.21</em>
              <b>-4.9%</b>
            </div>

            <div className="race-board">
              {raceZones.map((zone) => (
                <div key={zone.label} className={`race-zone ${zone.accent}`}>
                  <div className="race-marker">{zone.marker}</div>
                  <div className="race-label">{zone.label}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="challenge-layout">
            <div className="challenge-card">
              <span className="section-kicker">Live challenge</span>
              <strong>{activeGame.headline}</strong>
              <p>{activeGame.challenge}</p>
            </div>

            <div className="choice-preview">
              {activeGame.choices.map((choice) => (
                <div key={choice.label} className={`choice-preview-item ${choice.tone}`}>
                  <span>{choice.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </article>

      <section className="lower-grid">
        <article className="game-card details-card">
          <div className="section-kicker">Game brief</div>
          <h2>{activeGame.headline}</h2>
          <p>{activeGame.description}</p>

          <div className="detail-panels">
            <div className="detail-tile">
              <span className="section-kicker">Challenge</span>
              <strong>{activeGame.challenge}</strong>
            </div>
            <div className="detail-tile">
              <span className="section-kicker">Choices</span>
              <div className="choice-chip-row">
                {activeGame.choices.map((choice) => (
                  <span key={choice.label} className={`choice-chip ${choice.tone}`}>
                    {choice.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </article>

        {mode === "Pro" && (
          <article className="game-card evidence-card">
            <div className="section-kicker">Evidence / Resolution Rules</div>
            <div className="evidence-grid">
              <div>
                <span>Resolver</span>
                <strong>GenLayer Intelligent Contract</strong>
              </div>
              <div>
                <span>Evidence</span>
                <strong>public URLs, submitted documents, or official sources</strong>
              </div>
              <div>
                <span>Output</span>
                <strong>winning_choice, confidence, evidence_summary</strong>
              </div>
              <div>
                <span>Status</span>
                <strong>mocked for MVP</strong>
              </div>
            </div>
            <p>{activeGame.evidenceHint}</p>
          </article>
        )}

        <article className="game-card leaderboard-card">
          <div className="section-kicker">Leaderboard preview</div>
          <div className="leaderboard-list">
            {leaderboardPreview.map((entry) => (
              <div key={entry.rank} className="leaderboard-row">
                <span>{entry.rank}</span>
                <strong>{entry.wallet}</strong>
                <em>{entry.points}</em>
              </div>
            ))}
          </div>
        </article>

        <article className="game-card contract-card">
          <div className="section-kicker">MVP contract interface</div>
          <div className="contract-lines">
            {Object.values(mvpContractInterface).map((line) => (
              <code key={line}>{line}</code>
            ))}
          </div>
        </article>
      </section>
    </section>
  );
}

function RoundPanel({
  activeGame,
  selectedCall,
  selectedSize,
  onSelectCall,
  onSelectSize,
  onEnterRound
}: {
  activeGame: GameMode;
  selectedCall: string;
  selectedSize: number;
  onSelectCall: (value: string) => void;
  onSelectSize: (value: number) => void;
  onEnterRound: () => void;
}) {
  const assetTitle = activeGame.id === "race" ? "BTC/USD" : `${activeGame.label} / ${activeGame.asset}`;

  return (
    <article className="game-card round-panel">
      <div className="panel-topline">
        <div>
          <h2>{assetTitle}</h2>
          <span className="asset-badge">{activeGame.asset}</span>
        </div>
        <div className="round-meta">
          <span>next round</span>
          <strong>Locks 24s</strong>
          <em>Finish 84s</em>
        </div>
      </div>

      <div className="section-block">
        <span className="section-kicker">Size (points)</span>
        <div className="size-grid">
          {sizes.map((size) => (
            <button
              key={size}
              type="button"
              className={selectedSize === size ? "active" : ""}
              onClick={() => onSelectSize(size)}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      <div className="section-block">
        <span className="section-kicker">Pick your call</span>
        <div className="call-list">
          {activeGame.choices.map((choice) => (
            <button
              key={choice.label}
              type="button"
              className={selectedCall === choice.label ? `call-button ${choice.tone} active` : `call-button ${choice.tone}`}
              onClick={() => onSelectCall(choice.label)}
            >
              <span>
                {choice.tone === "positive" ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                {choice.label}
              </span>
              <em>0% pool</em>
            </button>
          ))}
        </div>
      </div>

      <button type="button" className="enter-button" disabled={!selectedCall} onClick={onEnterRound}>
        Enter Round
      </button>
      <p className="panel-note">
        {selectedCall ? "Mocked round entry for MVP demo state." : "Select a call and size to enter"}
      </p>
    </article>
  );
}

function BalanceCard() {
  return (
    <article className="game-card balance-card">
      <div className="balance-top">
        <div>
          <span>Cash</span>
          <strong>0.00</strong>
        </div>
        <div>
          <span>Coins</span>
          <strong>200.00</strong>
        </div>
      </div>

      <div className="balance-actions">
        <button type="button">Deposit</button>
        <button type="button">Transfer</button>
        <button type="button">Withdraw</button>
      </div>

      <div className="balance-stats">
        <div><span>Available to Trade</span><strong>$0.00</strong></div>
        <div><span>Unrealized PNL</span><strong>$0.00</strong></div>
        <div><span>Margin Used</span><strong>$0.00</strong></div>
      </div>
    </article>
  );
}

function SideLeaderboard() {
  return (
    <article className="game-card side-leaderboard">
      <div className="section-kicker">Points board</div>
      {leaderboardPreview.map((entry) => (
        <div key={entry.rank} className="leaderboard-row compact">
          <span>{entry.rank}</span>
          <strong>{entry.wallet}</strong>
          <em>{entry.points}</em>
        </div>
      ))}
    </article>
  );
}

function BottomPanel({
  activeTab,
  positions,
  onTab
}: {
  activeTab: (typeof tabs)[number];
  positions: PositionEntry[];
  onTab: (value: (typeof tabs)[number]) => void;
}) {
  const showPositions = activeTab === "Positions";

  return (
    <article className="game-card bottom-panel">
      <div className="tab-row">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            className={tab === activeTab ? "active" : ""}
            onClick={() => onTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {showPositions && positions.length > 0 ? (
        <div className="positions-table">
          <div className="positions-head">
            <span>Game</span>
            <span>Asset</span>
            <span>Pick</span>
            <span>Size</span>
            <span>Status</span>
            <span>Round ID</span>
            <span>Time</span>
          </div>
          {positions.map((position) => (
            <div key={position.id} className="positions-row">
              <span>{position.game}</span>
              <span>{position.asset}</span>
              <span>{position.pick}</span>
              <span>{position.size}</span>
              <span className="pending">{position.status}</span>
              <span>{position.id}</span>
              <span>{position.time}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <BriefcaseBusiness size={28} />
          <strong>{showPositions ? "No open positions across products" : `${activeTab} is mocked for the arcade MVP.`}</strong>
          <p>{showPositions ? "Enter a round from the call panel to create a mocked position." : "This tab is ready for future GenLayer-connected data."}</p>
        </div>
      )}
    </article>
  );
}
