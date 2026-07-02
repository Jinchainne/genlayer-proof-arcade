"use client";

import { useEffect, useMemo, useState } from "react";
import {
  createPublicClient,
  createWalletClient,
  custom,
  defineChain,
  formatEther,
  http,
  parseAbi
} from "viem";
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
  LoaderCircle,
  Newspaper,
  RefreshCw,
  ScrollText,
  ShieldCheck,
  Sparkles,
  Trophy,
  Wallet,
  Zap
} from "lucide-react";

type ChoiceTone = "negative" | "warning" | "positive";
type GameId = "race" | "build" | "doc-hunt" | "news-pulse" | "judge" | "flip" | "roll" | "spin";
type Mode = "Lite" | "Pro";
type NavItem = (typeof navItems)[number];
type TabItem = (typeof tabs)[number];

type Choice = {
  label: string;
  tone: ChoiceTone;
};

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
  liveEnabled: boolean;
};

type PositionEntry = {
  id: string;
  game: string;
  asset: string;
  pick: string;
  size: number;
  status: string;
  time: string;
  txHash?: string;
};

type RaceRound = {
  type: "race";
  updatedAt: string;
  source: string;
  asset: string;
  status: string;
  timer: { lockSeconds: number; finishSeconds: number };
  price: {
    last: number;
    toBeat: number;
    changePercent: number;
    open: number;
    bid: number;
    ask: number;
    volume: number;
  };
  candles: Array<{ open: number; high: number; low: number; close: number; volume: number }>;
  depth: { bidDepth: number; askDepth: number };
  callPool: Record<string, number>;
};

type NewsRound = {
  type: "news-pulse";
  updatedAt: string;
  source: string;
  headline: string;
  challenge: string;
  evidence: string;
  headlines: Array<{ title: string; link: string; source: string }>;
};

type BuildRound = {
  type: "build";
  updatedAt: string;
  source: string;
  challenge: string;
  candidates: Array<{
    name: string;
    stars: number;
    forks: number;
    updatedAt: string;
    description: string;
  }>;
};

type JudgeRound = {
  type: "judge";
  updatedAt: string;
  source: string;
  challenge: string;
  evidence: string;
  issues: Array<{
    title: string;
    url: string;
    comments: number;
    body: string;
  }>;
};

type GenericRound = {
  type: "generic";
  updatedAt: string;
  source: string;
  challenge: string;
  evidence: string;
};

type LiveRound = RaceRound | NewsRound | BuildRound | JudgeRound | GenericRound;

type EthereumProvider = {
  isMetaMask?: boolean;
  isRabby?: boolean;
  isOkxWallet?: boolean;
  providers?: EthereumProvider[];
  request: (args: { method: string; params?: unknown[] | object }) => Promise<unknown>;
};

declare global {
  interface Window {
    ethereum?: EthereumProvider;
    okxwallet?: {
      ethereum?: EthereumProvider;
    };
  }
}

const navItems = ["Trade", "Arcade", "Portfolio", "Leaderboard", "Earn Points", "Guides"] as const;
const tabs = ["Positions", "Perps", "Originals", "Outcomes", "Open Orders", "Balances", "History"] as const;
const sizes = [1, 10, 50, 100];
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS;
const STUDIO_RPC_URL = "https://studio.genlayer.com/api";
const STUDIO_CHAIN_ID_HEX = "0xf22f";
const genLayerStudionet = defineChain({
  id: 61999,
  name: "GenLayer Studionet",
  nativeCurrency: {
    name: "GEN",
    symbol: "GEN",
    decimals: 18
  },
  rpcUrls: {
    default: {
      http: [STUDIO_RPC_URL]
    }
  },
  blockExplorers: {
    default: {
      name: "GenLayer Studio Explorer",
      url: "https://explorer-studio.genlayer.com"
    }
  }
});
const arcadeAbi = parseAbi([
  "function create_round(string question, string[] choices, string resolution_rules, uint256 start_time, uint256 lock_time, uint256 end_time)",
  "function enter_round(uint256 round_id, string choice, uint256 points)",
  "function resolve_round(uint256 round_id)",
  "function claim_reward(uint256 round_id)"
]);

const baseGames: GameMode[] = [
  {
    id: "race",
    label: "Race",
    asset: "BTC",
    icon: Flame,
    description: "Live BTC round powered by Binance market data and live order flow snapshots.",
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
    evidenceHint: "Live Binance last price, prior minute close, and order-book pressure drive the lane judgment.",
    liveEnabled: true
  },
  {
    id: "build",
    label: "Build",
    asset: "AI",
    icon: Layers3,
    description: "Live builder challenge using real GenLayer GitHub repository activity and repo health.",
    headline: "Builder challenge room",
    challenge: "Which builder project best satisfies public demo, shipping speed, measurable output, and clean delivery?",
    choices: [
      { label: "Builder Alpha", tone: "positive" },
      { label: "Builder Beta", tone: "warning" },
      { label: "Builder Gamma", tone: "positive" },
      { label: "Builder Delta", tone: "warning" }
    ],
    evidenceHint: "Live repository stars, forks, freshness, and descriptions form the evidence set.",
    liveEnabled: true
  },
  {
    id: "doc-hunt",
    label: "Doc Hunt",
    asset: "TRADE",
    icon: FileSearch,
    description: "User-submitted document rounds will route into GenLayer for adjudication once the round contract is deployed.",
    headline: "Document mismatch sprint",
    challenge: "Sales Contract quantity: 5,000 cartons. Packing List quantity: 4,800 cartons. What is the issue?",
    choices: [
      { label: "Clean", tone: "positive" },
      { label: "Minor discrepancy", tone: "warning" },
      { label: "Major discrepancy", tone: "negative" },
      { label: "Fraud risk", tone: "negative" },
      { label: "Missing document", tone: "warning" }
    ],
    evidenceHint: "This mode is contract-ready but still waiting for a dedicated live public document source.",
    liveEnabled: false
  },
  {
    id: "news-pulse",
    label: "News Pulse",
    asset: "WEB",
    icon: Newspaper,
    description: "Live crypto media headlines from CoinDesk and Cointelegraph.",
    headline: "Signal versus noise board",
    challenge: "A governance account hints at a token unlock pause. Will public evidence confirm the event within the round window?",
    choices: [
      { label: "Confirmed", tone: "positive" },
      { label: "Not confirmed", tone: "negative" },
      { label: "Bullish", tone: "positive" },
      { label: "Bearish", tone: "warning" }
    ],
    evidenceHint: "Live headline links and official public URLs can be used for confirmation.",
    liveEnabled: true
  },
  {
    id: "judge",
    label: "Judge",
    asset: "GEN",
    icon: Gavel,
    description: "Live public issue evidence using current GenLayer GitHub issues as adjudication input.",
    headline: "Dispute chamber",
    challenge: "Two parties disagree on milestone completion. Which side satisfies the posted delivery checklist?",
    choices: [
      { label: "Claim upheld", tone: "positive" },
      { label: "Claim rejected", tone: "negative" },
      { label: "Need more evidence", tone: "warning" }
    ],
    evidenceHint: "Issue bodies, comments, and public links form the current evidence bundle.",
    liveEnabled: true
  },
  {
    id: "flip",
    label: "Flip",
    asset: "BTC",
    icon: Coins,
    description: "Fast binary round also grounded in live BTC market direction.",
    headline: "Binary momentum room",
    challenge: "Will BTC print above the session open before the micro round ends?",
    choices: [
      { label: "Heads", tone: "positive" },
      { label: "Tails", tone: "negative" }
    ],
    evidenceHint: "Live BTC market direction and minute closes power the binary round.",
    liveEnabled: true
  },
  {
    id: "roll",
    label: "Roll",
    asset: "POINTS",
    icon: Gift,
    description: "Live points ladder will unlock after the round contract adds score accounting.",
    headline: "Points ladder",
    challenge: "Choose the lane most likely to hit the daily target band before the roll timer closes.",
    choices: [
      { label: "Safe lane", tone: "positive" },
      { label: "Mid lane", tone: "warning" },
      { label: "High risk lane", tone: "negative" }
    ],
    evidenceHint: "Waiting on contract-side points accounting.",
    liveEnabled: false
  },
  {
    id: "spin",
    label: "Spin",
    asset: "DAILY",
    icon: Sparkles,
    description: "Daily challenge mode will become live once daily rotating rounds are created onchain.",
    headline: "Daily spin room",
    challenge: "A rotating prompt drops every day. Pick the best outcome before the spin resolves.",
    choices: [
      { label: "Bonus spin", tone: "positive" },
      { label: "Treasure", tone: "positive" },
      { label: "Try again", tone: "warning" },
      { label: "Miss", tone: "negative" }
    ],
    evidenceHint: "Daily rotation is ready for a future onchain scheduler.",
    liveEnabled: false
  }
];

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
  const [mode, setMode] = useState<Mode>("Pro");
  const [positions, setPositions] = useState<PositionEntry[]>([]);
  const [roundId, setRoundId] = useState(1);
  const [activeTab, setActiveTab] = useState<TabItem>("Positions");
  const [nav, setNav] = useState<NavItem>("Arcade");
  const [liveRound, setLiveRound] = useState<LiveRound | null>(null);
  const [liveLoading, setLiveLoading] = useState(true);
  const [liveError, setLiveError] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [walletBalance, setWalletBalance] = useState("0.0000");
  const [walletLabel, setWalletLabel] = useState("Wallet disconnected");
  const [walletBusy, setWalletBusy] = useState(false);
  const [tradeBusy, setTradeBusy] = useState(false);
  const [resolveBusy, setResolveBusy] = useState(false);
  const [contractStatus, setContractStatus] = useState(
    CONTRACT_ADDRESS ? "Contract adapter ready." : "Set NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS to enable live onchain rounds."
  );

  const activeGame = useMemo(
    () => baseGames.find((game) => game.id === selectedGame) ?? baseGames[0],
    [selectedGame]
  );

  const raceRound = liveRound?.type === "race" ? liveRound : null;
  const newsRound = liveRound?.type === "news-pulse" ? liveRound : null;
  const buildRound = liveRound?.type === "build" ? liveRound : null;
  const judgeRound = liveRound?.type === "judge" ? liveRound : null;
  const callPool = raceRound?.callPool;

  useEffect(() => {
    let cancelled = false;

    async function loadLiveRound() {
      setLiveLoading(true);
      setLiveError("");
      try {
        const response = await fetch(`/api/live-round?game=${selectedGame}`, { cache: "no-store" });
        if (!response.ok) throw new Error("Live round fetch failed");
        const payload = await response.json();
        if (!cancelled) {
          setLiveRound(payload);
        }
      } catch (error) {
        if (!cancelled) {
          setLiveError(error instanceof Error ? error.message : "Live round fetch failed");
        }
      } finally {
        if (!cancelled) {
          setLiveLoading(false);
        }
      }
    }

    loadLiveRound();
    const timer = window.setInterval(loadLiveRound, selectedGame === "race" || selectedGame === "flip" ? 10000 : 30000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [selectedGame]);

  async function connectWallet() {
    try {
      setWalletBusy(true);
      const provider = getBrowserProvider();
      if (!provider) throw new Error("No EVM wallet found. Use MetaMask, Rabby, or OKX Wallet.");

      const accounts = await provider.request({ method: "eth_requestAccounts" }) as string[];
      const address = accounts?.[0];
      if (!address) throw new Error("Wallet returned no account.");

      const chainId = await provider.request({ method: "eth_chainId" }) as string;
      const balanceHex = await provider.request({ method: "eth_getBalance", params: [address, "latest"] }) as string;
      setWalletAddress(address);
      setWalletBalance(formatToken(balanceHex));
      setWalletLabel(`${detectWalletName(provider)} / ${chainId === STUDIO_CHAIN_ID_HEX ? "Studionet" : chainId}`);
      setContractStatus(CONTRACT_ADDRESS ? "Wallet connected. Contract adapter ready." : "Wallet connected. Add a GenLayer contract address to enter live rounds onchain.");
    } catch (error) {
      setContractStatus(error instanceof Error ? error.message : "Wallet connection failed.");
    } finally {
      setWalletBusy(false);
    }
  }

  async function enterRound() {
    if (!selectedCall) return;
    if (!walletAddress) {
      setContractStatus("Connect a wallet before entering a live round.");
      return;
    }
    if (!CONTRACT_ADDRESS) {
      setContractStatus("Missing NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS for live contract writes.");
      return;
    }

    try {
      setTradeBusy(true);
      setContractStatus("Submitting enter_round transaction on GenLayer...");
      const txHash = await writeGenLayerContract("enter_round", [String(roundId), selectedCall, selectedSize]);
      const stamp = new Date().toLocaleTimeString("en-GB", { hour12: false });
      setPositions((current) => [
        {
          id: `#${String(roundId).padStart(4, "0")}`,
          game: activeGame.label,
          asset: activeGame.id === "race" || activeGame.id === "flip" ? "BTC/USD" : activeGame.asset,
          pick: selectedCall,
          size: selectedSize,
          status: "Submitted onchain",
          time: stamp,
          txHash
        },
        ...current
      ]);
      setRoundId((current) => current + 1);
      setActiveTab("Positions");
      setContractStatus(`Live round entered onchain: ${shortHash(txHash)}`);
    } catch (error) {
      setContractStatus(error instanceof Error ? error.message : "enter_round failed.");
    } finally {
      setTradeBusy(false);
    }
  }

  async function resolveRound() {
    if (!walletAddress) {
      setContractStatus("Connect a wallet before resolving a round.");
      return;
    }
    if (!CONTRACT_ADDRESS) {
      setContractStatus("Missing NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS for resolve_round.");
      return;
    }

    try {
      setResolveBusy(true);
      setContractStatus("Submitting resolve_round transaction on GenLayer...");
      const txHash = await writeGenLayerContract("resolve_round", [String(Math.max(1, roundId - 1))]);
      setContractStatus(`Resolve transaction accepted: ${shortHash(txHash)}`);
    } catch (error) {
      setContractStatus(error instanceof Error ? error.message : "resolve_round failed.");
    } finally {
      setResolveBusy(false);
    }
  }

  async function writeGenLayerContract(
    functionName: "create_round" | "enter_round" | "resolve_round" | "claim_reward",
    args: readonly unknown[]
  ) {
    const provider = getBrowserProvider();
    if (!provider || !walletAddress || !CONTRACT_ADDRESS) {
      throw new Error("Wallet or contract address missing.");
    }

    await ensureStudionet(provider);
    const walletClient = createWalletClient({
      chain: genLayerStudionet,
      transport: custom(provider as any),
      account: walletAddress as `0x${string}`
    });
    const txHash = await walletClient.writeContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      abi: arcadeAbi,
      functionName,
      args: args as never
    });
    const publicClient = createPublicClient({
      chain: genLayerStudionet,
      transport: http(STUDIO_RPC_URL)
    });
    await publicClient.waitForTransactionReceipt({
      hash: txHash,
    });
    return txHash;
  }

  return (
    <main className="arcade-shell">
      <TopNav
        autoSign={autoSign}
        mode={mode}
        nav={nav}
        walletAddress={walletAddress}
        walletBusy={walletBusy}
        walletLabel={walletLabel}
        onConnectWallet={connectWallet}
        onNav={setNav}
        onToggleAutoSign={() => setAutoSign((current) => !current)}
        onMode={setMode}
      />

      <section className="arcade-layout">
        <SidebarMenu activeGame={selectedGame} onSelect={setSelectedGame} />

        <section className="arcade-center">
          <GameBoard
            activeGame={activeGame}
            liveRound={liveRound}
            raceRound={raceRound}
            liveLoading={liveLoading}
            liveError={liveError}
            mode={mode}
          />
          <BottomPanel activeTab={activeTab} positions={positions} onTab={setActiveTab} />
        </section>

        <aside className="arcade-right">
          <RoundPanel
            activeGame={activeGame}
            liveRound={liveRound}
            selectedCall={selectedCall}
            selectedSize={selectedSize}
            tradeBusy={tradeBusy}
            resolveBusy={resolveBusy}
            contractStatus={contractStatus}
            walletConnected={Boolean(walletAddress)}
            callPool={callPool}
            onSelectCall={setSelectedCall}
            onSelectSize={setSelectedSize}
            onEnterRound={enterRound}
            onResolveRound={resolveRound}
          />
          <BalanceCard balance={walletBalance} walletAddress={walletAddress} />
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
  walletAddress,
  walletBusy,
  walletLabel,
  onConnectWallet,
  onNav,
  onToggleAutoSign,
  onMode
}: {
  autoSign: boolean;
  mode: Mode;
  nav: NavItem;
  walletAddress: string;
  walletBusy: boolean;
  walletLabel: string;
  onConnectWallet: () => void;
  onNav: (value: NavItem) => void;
  onToggleAutoSign: () => void;
  onMode: (value: Mode) => void;
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

        <button type="button" className="wallet-chip" onClick={onConnectWallet}>
          <Wallet size={14} />
          <span>{walletBusy ? "Connecting..." : walletAddress ? shortAddress(walletAddress) : "Connect wallet"}</span>
        </button>

        <div className="wallet-status-chip">{walletLabel}</div>

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
        {baseGames.map((game) => {
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
                <div>
                  <span>{game.label}</span>
                  <small>{game.liveEnabled ? "LIVE" : "READY"}</small>
                </div>
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
  liveRound,
  raceRound,
  liveLoading,
  liveError,
  mode
}: {
  activeGame: GameMode;
  liveRound: LiveRound | null;
  raceRound: RaceRound | null;
  liveLoading: boolean;
  liveError: string;
  mode: Mode;
}) {
  const isRace = activeGame.id === "race" || activeGame.id === "flip";

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
            <span>{isRace && liveRound?.type === "race" ? liveRound.status : "Live round"}</span>
            <strong>{isRace && liveRound?.type === "race" ? `Finish in ${liveRound.timer.lockSeconds}s` : "Public feed"}</strong>
          </div>
        </div>

        <div className="source-strip">
          <div>
            <ShieldCheck size={14} />
            <span>{liveRound ? liveRound.source : activeGame.liveEnabled ? "Fetching source" : "User evidence mode"}</span>
          </div>
          <div>
            {liveLoading ? <LoaderCircle size={14} className="spin" /> : <RefreshCw size={14} />}
            <span>{liveRound?.updatedAt ? formatUpdateTime(liveRound.updatedAt) : liveError || "Waiting for refresh"}</span>
          </div>
        </div>

        <div className="progress-rail">
          <div className="progress-fill" />
        </div>

        {isRace ? (
          <div className="race-layout">
            <div className="price-box">
              <span>{raceRound ? raceRound.asset : "BTC/USD"}</span>
              <strong>{raceRound ? formatPrice(raceRound.price.last) : "--"}</strong>
              <em>{raceRound ? `To beat ${formatPrice(raceRound.price.toBeat)}` : "Waiting for market data"}</em>
              <b className={raceRound && raceRound.price.changePercent >= 0 ? "positive" : ""}>
                {raceRound ? `${raceRound.price.changePercent.toFixed(2)}%` : "--"}
              </b>
            </div>

            <div className="race-board">
              {raceZones.map((zone) => (
                <div key={zone.label} className={`race-zone ${zone.accent}`}>
                  <div className="race-marker">{zone.marker}</div>
                  <div className="race-label">{zone.label}</div>
                  <div className="lane-pool">
                    Pool {raceRound ? `${raceRound.callPool[zone.label] ?? 0}%` : "--"}
                  </div>
                </div>
              ))}
            </div>

            {raceRound && (
              <div className="market-metrics">
                <div><span>Bid</span><strong>{formatPrice(raceRound.price.bid)}</strong></div>
                <div><span>Ask</span><strong>{formatPrice(raceRound.price.ask)}</strong></div>
                <div><span>24h volume</span><strong>{formatCompactUsd(raceRound.price.volume)}</strong></div>
                <div><span>Bid depth</span><strong>{raceRound.depth.bidDepth.toFixed(3)}</strong></div>
                <div><span>Ask depth</span><strong>{raceRound.depth.askDepth.toFixed(3)}</strong></div>
                <div><span>Open</span><strong>{formatPrice(raceRound.price.open)}</strong></div>
              </div>
            )}
          </div>
        ) : (
          <div className="challenge-layout">
            <div className="challenge-card">
              <span className="section-kicker">Live challenge</span>
              <strong>{extractHeadline(activeGame, liveRound)}</strong>
              <p>{extractChallenge(activeGame, liveRound)}</p>
            </div>

            <div className="choice-preview">
              {deriveChoices(activeGame, liveRound).map((choice) => (
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
          <div className="section-kicker">Evidence stream</div>
          <h2>{extractHeadline(activeGame, liveRound)}</h2>
          <p>{extractEvidence(activeGame, liveRound)}</p>
          <div className="detail-panels">
            {renderDetailTiles(activeGame, liveRound)}
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
                <strong>{activeGame.liveEnabled ? "live feed + contract-ready adapter" : "waiting for dedicated live source"}</strong>
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
  liveRound,
  selectedCall,
  selectedSize,
  tradeBusy,
  resolveBusy,
  contractStatus,
  walletConnected,
  callPool,
  onSelectCall,
  onSelectSize,
  onEnterRound,
  onResolveRound
}: {
  activeGame: GameMode;
  liveRound: LiveRound | null;
  selectedCall: string;
  selectedSize: number;
  tradeBusy: boolean;
  resolveBusy: boolean;
  contractStatus: string;
  walletConnected: boolean;
  callPool?: Record<string, number>;
  onSelectCall: (value: string) => void;
  onSelectSize: (value: number) => void;
  onEnterRound: () => void;
  onResolveRound: () => void;
}) {
  const assetTitle = activeGame.id === "race" || activeGame.id === "flip" ? "BTC/USD" : `${activeGame.label} / ${activeGame.asset}`;

  return (
    <article className="game-card round-panel">
      <div className="panel-topline">
        <div>
          <h2>{assetTitle}</h2>
          <span className="asset-badge">{activeGame.asset}</span>
        </div>
        <div className="round-meta">
          <span>next round</span>
          <strong>{liveRound?.type === "race" ? `Locks ${liveRound.timer.lockSeconds}s` : "Live source"}</strong>
          <em>{walletConnected ? "Wallet ready" : "Connect wallet"}</em>
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
          {deriveChoices(activeGame, liveRound).map((choice) => (
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
              <em>{callPool?.[choice.label] ? `${callPool[choice.label]}% pool` : "live"}</em>
            </button>
          ))}
        </div>
      </div>

      <button type="button" className="enter-button" disabled={!selectedCall || tradeBusy} onClick={onEnterRound}>
        {tradeBusy ? "Submitting onchain..." : "Enter Round"}
      </button>
      <button type="button" className="secondary-button" disabled={resolveBusy} onClick={onResolveRound}>
        {resolveBusy ? "Resolving..." : "Resolve Round"}
      </button>
      <p className="panel-note">{contractStatus}</p>
    </article>
  );
}

function BalanceCard({ balance, walletAddress }: { balance: string; walletAddress: string }) {
  return (
    <article className="game-card balance-card">
      <div className="balance-top">
        <div>
          <span>Cash</span>
          <strong>0.00</strong>
        </div>
        <div>
          <span>Coins</span>
          <strong>{walletAddress ? balance : "200.00"}</strong>
        </div>
      </div>

      <div className="balance-actions">
        <button type="button">Deposit</button>
        <button type="button">Transfer</button>
        <button type="button">Withdraw</button>
      </div>

      <div className="balance-stats">
        <div><span>Available to Trade</span><strong>{walletAddress ? `${balance} GEN` : "$0.00"}</strong></div>
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
  activeTab: TabItem;
  positions: PositionEntry[];
  onTab: (value: TabItem) => void;
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
            <div key={`${position.id}-${position.time}`} className="positions-row">
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
          <strong>{showPositions ? "No open positions across products" : `${activeTab} is reserved for live contract data.`}</strong>
          <p>{showPositions ? "A position appears here after a successful onchain enter_round transaction." : "This tab is ready for future GenLayer-connected indexing."}</p>
        </div>
      )}
    </article>
  );
}

function deriveChoices(activeGame: GameMode, liveRound: LiveRound | null) {
  if (activeGame.id === "build" && liveRound?.type === "build") {
    return liveRound.candidates.map((candidate: BuildRound["candidates"][number], index: number) => ({
      label: candidate.name,
      tone: index < 2 ? "positive" : "warning"
    })) as Choice[];
  }
  if (activeGame.id === "judge" && liveRound?.type === "judge") {
    return [
      { label: "Claim upheld", tone: "positive" },
      { label: "Claim rejected", tone: "negative" },
      { label: "Need more evidence", tone: "warning" }
    ] satisfies Choice[];
  }
  return activeGame.choices;
}

function extractHeadline(activeGame: GameMode, liveRound: LiveRound | null) {
  if (activeGame.id === "news-pulse" && liveRound?.type === "news-pulse") return liveRound.headline;
  if (activeGame.id === "build" && liveRound?.type === "build") return "Live GenLayer builder ranking";
  if (activeGame.id === "judge" && liveRound?.type === "judge") return liveRound.challenge;
  return activeGame.headline;
}

function extractChallenge(activeGame: GameMode, liveRound: LiveRound | null) {
  if (liveRound?.type === "race") return activeGame.challenge;
  if (liveRound?.type === "news-pulse") return liveRound.challenge;
  if (liveRound?.type === "build") return liveRound.challenge;
  if (liveRound?.type === "judge") return liveRound.evidence;
  if (liveRound?.type === "generic") return liveRound.challenge;
  return activeGame.challenge;
}

function extractEvidence(activeGame: GameMode, liveRound: LiveRound | null) {
  if (liveRound?.type === "news-pulse") return liveRound.evidence;
  if (liveRound?.type === "judge") return liveRound.evidence;
  if (liveRound?.type === "build") return "Live GitHub repository metrics from the genlayerlabs organization.";
  return activeGame.evidenceHint;
}

function renderDetailTiles(activeGame: GameMode, liveRound: LiveRound | null) {
  if (activeGame.id === "news-pulse" && liveRound?.type === "news-pulse") {
    return liveRound.headlines.slice(0, 4).map((headline: NewsRound["headlines"][number]) => (
      <div key={headline.link} className="detail-tile">
        <span className="section-kicker">{headline.source}</span>
        <strong>{headline.title}</strong>
      </div>
    ));
  }

  if (activeGame.id === "build" && liveRound?.type === "build") {
    return liveRound.candidates.map((candidate: BuildRound["candidates"][number]) => (
      <div key={candidate.name} className="detail-tile">
        <span className="section-kicker">{candidate.stars} stars / {candidate.forks} forks</span>
        <strong>{candidate.name}</strong>
        <p>{candidate.description}</p>
      </div>
    ));
  }

  if (activeGame.id === "judge" && liveRound?.type === "judge") {
    return liveRound.issues.map((issue: JudgeRound["issues"][number]) => (
      <div key={issue.url} className="detail-tile">
        <span className="section-kicker">{issue.comments} comments</span>
        <strong>{issue.title}</strong>
        <p>{issue.body || "Open public issue used as live evidence input."}</p>
      </div>
    ));
  }

  return [
    <div key="challenge" className="detail-tile">
      <span className="section-kicker">Challenge</span>
      <strong>{extractChallenge(activeGame, liveRound)}</strong>
    </div>,
    <div key="choices" className="detail-tile">
      <span className="section-kicker">Choices</span>
      <div className="choice-chip-row">
        {deriveChoices(activeGame, liveRound).map((choice) => (
          <span key={choice.label} className={`choice-chip ${choice.tone}`}>
            {choice.label}
          </span>
        ))}
      </div>
    </div>
  ];
}

function getBrowserProvider() {
  if (typeof window === "undefined") return undefined;
  if (window.ethereum?.providers?.length) {
    const preferred = window.ethereum.providers.find((provider) => provider.isMetaMask || provider.isRabby || provider.isOkxWallet);
    return preferred ?? window.ethereum.providers[0];
  }
  return window.okxwallet?.ethereum ?? window.ethereum;
}

function detectWalletName(provider: EthereumProvider) {
  if (provider.isRabby) return "Rabby";
  if (provider.isOkxWallet) return "OKX";
  if (provider.isMetaMask) return "MetaMask";
  return "EVM Wallet";
}

async function ensureStudionet(provider: EthereumProvider) {
  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: STUDIO_CHAIN_ID_HEX }]
    });
  } catch {
    await provider.request({
      method: "wallet_addEthereumChain",
      params: [{
        chainId: STUDIO_CHAIN_ID_HEX,
        chainName: "GenLayer Studionet",
        nativeCurrency: {
          name: "GEN",
          symbol: "GEN",
          decimals: 18
        },
        rpcUrls: [STUDIO_RPC_URL],
        blockExplorerUrls: ["https://explorer-studio.genlayer.com"]
      }]
    });
  }
}

function formatToken(valueHex: string) {
  return Number(formatEther(BigInt(valueHex))).toFixed(4);
}

function shortAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function shortHash(hash: string) {
  return `${hash.slice(0, 10)}...${hash.slice(-6)}`;
}

function formatPrice(value: number) {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatCompactUsd(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2
  }).format(value);
}

function formatUpdateTime(value: string) {
  return new Date(value).toLocaleTimeString("en-GB", { hour12: false });
}
