"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
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
  ChevronRight,
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
  roundNumber: number;
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
  evidenceUrls: string[];
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
  evidenceUrls: string[];
  headlines: Array<{ title: string; link: string; source: string }>;
};

type BuildRound = {
  type: "build";
  updatedAt: string;
  source: string;
  challenge: string;
  evidenceUrls: string[];
  candidates: Array<{
    name: string;
    stars: number;
    forks: number;
    updatedAt: string;
    description: string;
    url: string;
  }>;
};

type JudgeRound = {
  type: "judge";
  updatedAt: string;
  source: string;
  challenge: string;
  evidence: string;
  evidenceUrls: string[];
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
  evidenceUrls: string[];
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
const categoryItems = ["Trending", "World Cup", "Politics", "Sports", "Crypto", "AI", "Finance", "Culture", "Economy", "Weather"] as const;
const DEFAULT_CONTRACT_ADDRESS = "0xd703a60C1697749e64A639A8941a7FDc49bE1919";
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS?.trim() || DEFAULT_CONTRACT_ADDRESS;
const STUDIO_NETWORK_NAME = "GenLayer Studio Network";
const STUDIO_RPC_URL = "https://studio.genlayer.com/api";
const STUDIO_CHAIN_ID_HEX = "0xf22f";
const genLayerStudionet = defineChain({
  id: 61999,
  name: STUDIO_NETWORK_NAME,
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
  "function create_round(string question, string[] choices, string resolution_rules, string[] evidence_urls, uint256 start_time, uint256 lock_time, uint256 end_time)",
  "function enter_round(uint256 round_id, string choice, uint256 points)",
  "function resolve_round(uint256 round_id)",
  "function claim_reward(uint256 round_id)",
  "function get_latest_round_id() view returns (uint256)"
]);

const baseGames: GameMode[] = [
  {
    id: "race",
    label: "Race",
    asset: "BTC",
    icon: Flame,
    description: "Live BTC round powered by Coinbase Exchange market data and order-flow snapshots.",
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
    evidenceHint: "Live Coinbase last price, prior minute close, and order-book pressure drive the lane judgment.",
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
    description: "Live trade-policy filings and public notices feed this discrepancy-detection board.",
    headline: "Document mismatch sprint",
    challenge: "Sales Contract quantity: 5,000 cartons. Packing List quantity: 4,800 cartons. What is the issue?",
    choices: [
      { label: "Clean", tone: "positive" },
      { label: "Minor discrepancy", tone: "warning" },
      { label: "Major discrepancy", tone: "negative" },
      { label: "Fraud risk", tone: "negative" },
      { label: "Missing document", tone: "warning" }
    ],
    evidenceHint: "Official USTR trade-policy notices and public releases are used as the document evidence stream.",
    liveEnabled: true
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
    description: "Live ETH volatility and top-of-book pressure drive the points ladder.",
    headline: "Points ladder",
    challenge: "Choose the lane most likely to hit the daily target band before the roll timer closes.",
    choices: [
      { label: "Safe lane", tone: "positive" },
      { label: "Mid lane", tone: "warning" },
      { label: "High risk lane", tone: "negative" }
    ],
    evidenceHint: "Live Coinbase ETH-USD open, last price, and depth provide the daily risk-lane evidence.",
    liveEnabled: true
  },
  {
    id: "spin",
    label: "Spin",
    asset: "DAILY",
    icon: Sparkles,
    description: "Daily rotating challenge keyed off the freshest public GenLayer repository activity.",
    headline: "Daily spin room",
    challenge: "A rotating prompt drops every day. Pick the best outcome before the spin resolves.",
    choices: [
      { label: "Bonus spin", tone: "positive" },
      { label: "Treasure", tone: "positive" },
      { label: "Try again", tone: "warning" },
      { label: "Miss", tone: "negative" }
    ],
    evidenceHint: "Public GitHub freshness and repo activity anchor the daily spin question.",
    liveEnabled: true
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

const marketDirectory = [
  { id: "race", category: "Crypto", title: "BTC breakout this round?", chance: "58%", volume: "$604K" },
  { id: "flip", category: "Crypto", title: "BTC above session open?", chance: "52%", volume: "$188K" },
  { id: "build", category: "AI", title: "Top GenLayer builder this cycle?", chance: "64%", volume: "$92K" },
  { id: "judge", category: "Politics", title: "Will the dispute claim be upheld?", chance: "49%", volume: "$71K" },
  { id: "news-pulse", category: "Trending", title: "Will public evidence confirm the headline?", chance: "61%", volume: "$83K" },
  { id: "doc-hunt", category: "Finance", title: "Is this trade filing materially inconsistent?", chance: "34%", volume: "$41K" },
  { id: "roll", category: "Economy", title: "Will ETH volatility breach the target band?", chance: "45%", volume: "$58K" },
  { id: "spin", category: "Culture", title: "Will the daily spin repo stay freshest?", chance: "57%", volume: "$36K" }
] as const;

type OverviewItem = {
  label: string;
  value: string;
  tone: "positive" | "warning" | "neutral";
};

type TickerItem = {
  label: string;
  value: string;
};

const mvpContractInterface = {
  create_round: "create_round(question, choices, resolution_rules, evidence_urls, start_time, lock_time, end_time)",
  enter_round: "enter_round(round_id, choice, points)",
  resolve_round: "resolve_round(round_id)",
  claim_reward: "claim_reward(round_id)"
};

export default function HomePage() {
  const [selectedGame, setSelectedGame] = useState<GameId>("race");
  const [activeCategory, setActiveCategory] = useState<(typeof categoryItems)[number]>("Trending");
  const [searchQuery, setSearchQuery] = useState("");
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
  const hasContract = Boolean(CONTRACT_ADDRESS);
  const [contractStatus, setContractStatus] = useState(
    hasContract ? "Contract adapter ready." : "Session mode active. Add NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS to switch to live onchain execution."
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
  const overviewItems = useMemo<OverviewItem[]>(() => {
    const primaryMetric = raceRound
      ? formatPrice(raceRound.price.last)
      : buildRound
        ? `${buildRound.candidates.length} live repos`
        : newsRound
          ? `${newsRound.headlines.length} headlines`
          : judgeRound
            ? `${judgeRound.issues.length} live disputes`
            : "Live feed";

    return [
      {
        label: "Network pulse",
        value: CONTRACT_ADDRESS ? "Contract ready" : "Wallet-signed flow",
        tone: "positive"
      },
      {
        label: "Active game",
        value: activeGame.label,
        tone: "neutral"
      },
      {
        label: "Current signal",
        value: primaryMetric,
        tone: "warning"
      },
      {
        label: "Wallet",
        value: walletAddress ? shortAddress(walletAddress) : "Not connected",
        tone: walletAddress ? "positive" : "neutral"
      }
    ];
  }, [activeGame.label, buildRound, judgeRound, newsRound, raceRound, walletAddress]);
  const tickerItems = useMemo<TickerItem[]>(
    () => buildTickerItems(activeGame, liveRound, walletAddress, contractStatus),
    [activeGame, liveRound, walletAddress, contractStatus]
  );

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
      setWalletLabel(`${detectWalletName(provider)} / ${chainId === STUDIO_CHAIN_ID_HEX ? "GenLayer Studio Network" : chainId}`);
      setContractStatus(hasContract ? "Wallet connected. Contract adapter ready." : "Wallet connected. Session mode active until a GenLayer contract address is configured.");
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

    try {
      setTradeBusy(true);
      const stamp = new Date().toLocaleTimeString("en-GB", { hour12: false });

      if (!CONTRACT_ADDRESS) {
        setPositions((current) => [
          {
            id: `#${String(roundId).padStart(4, "0")}`,
            roundNumber: roundId,
            game: activeGame.label,
            asset: activeGame.id === "race" || activeGame.id === "flip" ? "BTC/USD" : activeGame.asset,
            pick: selectedCall,
            size: selectedSize,
            status: "Queued locally",
            time: stamp
          },
          ...current
        ]);
        setRoundId((current) => current + 1);
        setActiveTab("Positions");
        setContractStatus("Session mode: round entered locally. Configure a GenLayer contract address for live writes.");
        return;
      }

      const onchainRoundId = await createOnchainRound(activeGame, liveRound);
      setContractStatus(`Submitting enter_round for round #${onchainRoundId} on GenLayer...`);
      const txHash = await writeGenLayerContract("enter_round", [BigInt(onchainRoundId), selectedCall, BigInt(selectedSize)]);
      setPositions((current) => [
        {
          id: `#${String(onchainRoundId).padStart(4, "0")}`,
          roundNumber: onchainRoundId,
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
      setRoundId(onchainRoundId + 1);
      setActiveTab("Positions");
      setContractStatus(`Live round #${onchainRoundId} entered onchain: ${shortHash(txHash)}`);
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

    try {
      setResolveBusy(true);
      if (!CONTRACT_ADDRESS) {
        setPositions((current) => {
          if (!current.length) return current;
          const [latest, ...rest] = current;
          const resolvedStatus =
            raceRound && latest.asset === "BTC/USD"
              ? raceRound.price.last >= raceRound.price.toBeat
                ? "Resolved locally: upside"
                : "Resolved locally: downside"
              : "Resolved locally";

          return [{ ...latest, status: resolvedStatus }, ...rest];
        });
        setContractStatus("Session mode: latest round resolved locally.");
        return;
      }

      const targetRoundId = positions[0]?.roundNumber ?? await readLatestRoundId();
      if (!targetRoundId) {
        throw new Error("No live onchain round found to resolve yet.");
      }

      setContractStatus(`Submitting resolve_round for round #${targetRoundId} on GenLayer...`);
      const txHash = await writeGenLayerContract("resolve_round", [BigInt(targetRoundId)]);
      setPositions((current) =>
        current.map((entry, index) =>
          index === 0 ? { ...entry, status: "Resolve submitted onchain" } : entry
        )
      );
      setContractStatus(`Resolve transaction accepted for round #${targetRoundId}: ${shortHash(txHash)}`);
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

  async function createOnchainRound(active: GameMode, round: LiveRound | null) {
    const now = Math.floor(Date.now() / 1000);
    const question = extractChallenge(active, round);
    const choices = deriveChoices(active, round).map((choice) => choice.label);
    const resolutionRules = `${extractEvidence(active, round)} Resolver: GenLayer Intelligent Contract.`;
    const evidenceUrls = extractEvidenceUrls(round);

    setContractStatus("Creating live round on GenLayer...");
    await writeGenLayerContract("create_round", [
      question,
      choices,
      resolutionRules,
      evidenceUrls,
      BigInt(now),
      BigInt(now + 24),
      BigInt(now + 84)
    ]);

    const latestRoundId = await readLatestRoundId();
    if (!latestRoundId) {
      throw new Error("Round created but latest onchain round id could not be confirmed.");
    }
    return latestRoundId;
  }

  async function readLatestRoundId() {
    if (!CONTRACT_ADDRESS) return 0;

    const publicClient = createPublicClient({
      chain: genLayerStudionet,
      transport: http(STUDIO_RPC_URL)
    });
    const result = await publicClient.readContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      abi: arcadeAbi,
      functionName: "get_latest_round_id"
    });
    return Number(result);
  }

  return (
    <main className="arcade-shell">
      <div className="arcade-backdrop" aria-hidden="true">
        <div className="aurora aurora-one" />
        <div className="aurora aurora-two" />
        <div className="grid-halo" />
        <div className="scanline scanline-one" />
        <div className="scanline scanline-two" />
      </div>

      <TopNav
        autoSign={autoSign}
        mode={mode}
        nav={nav}
        searchQuery={searchQuery}
        walletAddress={walletAddress}
        walletBusy={walletBusy}
        walletLabel={walletLabel}
        onConnectWallet={connectWallet}
        onNav={setNav}
        onSearch={setSearchQuery}
        onToggleAutoSign={() => setAutoSign((current) => !current)}
        onMode={setMode}
      />

      <CategoryRail activeCategory={activeCategory} onSelect={setActiveCategory} />

      <TickerRail items={tickerItems} />

      <OverviewStrip items={overviewItems} />

      <section className="arcade-layout">
        <SidebarMenu
          activeCategory={activeCategory}
          activeGame={selectedGame}
          onSelect={setSelectedGame}
          searchQuery={searchQuery}
        />

        <section className="arcade-center">
          <GameBoard
            activeGame={activeGame}
            liveRound={liveRound}
            raceRound={raceRound}
            liveLoading={liveLoading}
            liveError={liveError}
            mode={mode}
          />
          <MarketBrowser activeCategory={activeCategory} activeGame={selectedGame} onSelect={setSelectedGame} />
          <BottomPanel activeTab={activeTab} positions={positions} onTab={setActiveTab} />
        </section>

        <aside className="arcade-right">
          <RoundPanel
            activeGame={activeGame}
            liveRound={liveRound}
            hasContract={hasContract}
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
          <SystemPanel
            activeGame={activeGame}
            contractStatus={contractStatus}
            hasContract={hasContract}
            liveRound={liveRound}
            walletAddress={walletAddress}
            walletLabel={walletLabel}
          />
          <RelatedMarkets activeCategory={activeCategory} activeGame={selectedGame} onSelect={setSelectedGame} />
        </aside>
      </section>
    </main>
  );
}

function CategoryRail({
  activeCategory,
  onSelect
}: {
  activeCategory: (typeof categoryItems)[number];
  onSelect: (value: (typeof categoryItems)[number]) => void;
}) {
  return (
    <section className="category-rail">
      {categoryItems.map((item) => (
        <button key={item} type="button" className={activeCategory === item ? "active" : ""} onClick={() => onSelect(item)}>
          {item}
        </button>
      ))}
    </section>
  );
}

function TickerRail({ items }: { items: TickerItem[] }) {
  const loop = [...items, ...items];

  return (
    <section className="ticker-rail" aria-label="Live signal rail">
      <div className="ticker-track">
        {loop.map((item, index) => (
          <div key={`${item.label}-${index}`} className="ticker-pill">
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function OverviewStrip({
  items
}: {
  items: OverviewItem[];
}) {
  return (
    <section className="overview-strip">
      {items.map((item, index) => (
        <motion.article
          key={item.label}
          className={`overview-card ${item.tone}`}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.38, delay: index * 0.06 }}
        >
          <span>{item.label}</span>
          <strong>{item.value}</strong>
        </motion.article>
      ))}
    </section>
  );
}

function TopNav({
  autoSign,
  mode,
  nav,
  searchQuery,
  walletAddress,
  walletBusy,
  walletLabel,
  onConnectWallet,
  onNav,
  onSearch,
  onToggleAutoSign,
  onMode
}: {
  autoSign: boolean;
  mode: Mode;
  nav: NavItem;
  searchQuery: string;
  walletAddress: string;
  walletBusy: boolean;
  walletLabel: string;
  onConnectWallet: () => void;
  onNav: (value: NavItem) => void;
  onSearch: (value: string) => void;
  onToggleAutoSign: () => void;
  onMode: (value: Mode) => void;
}) {
  return (
    <motion.header
      className="arcade-topbar"
      initial={{ opacity: 0, y: -18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
    >
      <div className="arcade-brand">
        <div className="arcade-brand-mark">
          <Zap size={16} />
        </div>
        <div>
          <strong>Proof Arcade</strong>
          <span>GenLayer future signal arena</span>
        </div>
      </div>

      <div className="topbar-center">
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

        <label className="search-shell">
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => onSearch(event.target.value)}
            placeholder="Search markets, assets, or evidence..."
          />
        </label>
      </div>

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
    </motion.header>
  );
}

function SidebarMenu({
  activeCategory,
  activeGame,
  onSelect,
  searchQuery
}: {
  activeCategory: (typeof categoryItems)[number];
  activeGame: GameId;
  onSelect: (value: GameId) => void;
  searchQuery: string;
}) {
  const visibleMarkets = marketDirectory.filter((item) =>
    (activeCategory === "Trending" || item.category === activeCategory) &&
    (item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <motion.aside
      className="game-sidebar"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.45, delay: 0.08 }}
    >
      <div className="section-kicker">Markets</div>
      <div className="sidebar-copy">
        <strong>Prediction board</strong>
        <span>Browse high-signal markets, then lock a side in one click.</span>
      </div>
      <div className="game-menu">
        {visibleMarkets.map((market) => {
          const game = baseGames.find((entry) => entry.id === market.id)!;
          const Icon = game.icon;
          return (
            <motion.button
              key={market.id}
              type="button"
              className={activeGame === market.id ? "game-menu-item active" : "game-menu-item"}
              onClick={() => onSelect(market.id)}
              whileHover={{ x: 6, scale: 1.01 }}
              whileTap={{ scale: 0.985 }}
            >
              <div className="game-menu-left">
                <div className="game-menu-icon">
                  <Icon size={17} />
                </div>
                <div>
                  <span>{market.title}</span>
                  <small>{market.category} • {market.volume}</small>
                </div>
              </div>
              <em>{market.chance}</em>
            </motion.button>
          );
        })}
      </div>
    </motion.aside>
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
  const liveHeadline = extractHeadline(activeGame, liveRound);
  const liveChallenge = extractChallenge(activeGame, liveRound);
  const liveEvidence = extractEvidence(activeGame, liveRound);
  const spotlightMetrics = buildSpotlightMetrics(activeGame, liveRound);

  return (
    <section className="game-stack">
      <motion.article
        className="game-card race-card"
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.12 }}
      >
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

        <div className="hero-grid">
          <div className="hero-story">
            <span className="section-kicker">Live challenge</span>
            <h2>{liveHeadline}</h2>
            <p>{liveChallenge}</p>
            <div className="hero-tag-row">
              <span className="hero-tag">Consensus-ready</span>
              <span className="hero-tag">Global public evidence</span>
              <span className="hero-tag">{activeGame.liveEnabled ? "Live source" : "Queued source"}</span>
            </div>
            <div className="spotlight-grid">
              {spotlightMetrics.map((metric) => (
                <div key={metric.label} className="spotlight-card">
                  <span>{metric.label}</span>
                  <strong>{metric.value}</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="hero-side">
            <div className="hero-orb" />
            <div className="hero-side-copy">
              <span className="section-kicker">Pulse</span>
              <strong>{liveRound ? liveRound.source : "Syncing source"}</strong>
              <p>{liveEvidence}</p>
            </div>
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
                <motion.div
                  key={zone.label}
                  className={`race-zone ${zone.accent}`}
                  whileHover={{ y: -6, scale: 1.015 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="race-marker">{zone.marker}</div>
                  <div className="race-label">{zone.label}</div>
                  <div className="lane-pool">
                    Pool {raceRound ? `${raceRound.callPool[zone.label] ?? 0}%` : "--"}
                  </div>
                </motion.div>
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

            {raceRound && <RaceSignalChart round={raceRound} />}
          </div>
        ) : (
          <div className="challenge-layout">
            <div className="challenge-card">
              <span className="section-kicker">Live challenge</span>
              <strong>{liveHeadline}</strong>
              <p>{liveChallenge}</p>
            </div>

            <AnimatePresence mode="popLayout">
              <motion.div
                key={activeGame.id}
                className="choice-preview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.22 }}
              >
                {deriveChoices(activeGame, liveRound).map((choice) => (
                  <motion.div
                    key={choice.label}
                    className={`choice-preview-item ${choice.tone}`}
                    whileHover={{ y: -4, scale: 1.01 }}
                  >
                    <span>{choice.label}</span>
                  </motion.div>
                ))}
              </motion.div>
            </AnimatePresence>
          </div>
        )}
      </motion.article>

      <section className="lower-grid">
        <motion.article
          className="game-card details-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.18 }}
        >
          <div className="section-kicker">Evidence stream</div>
          <h2>{liveHeadline}</h2>
          <p>{liveEvidence}</p>
          <div className="detail-panels">
            {renderDetailTiles(activeGame, liveRound)}
          </div>
        </motion.article>

        {mode === "Pro" && (
          <motion.article
            className="game-card evidence-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.24 }}
          >
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
          </motion.article>
        )}

        <motion.article
          className="game-card leaderboard-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.3 }}
        >
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
        </motion.article>

        <motion.article
          className="game-card contract-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.36 }}
        >
          <div className="section-kicker">MVP contract interface</div>
          <div className="contract-lines">
            {Object.values(mvpContractInterface).map((line) => (
              <code key={line}>{line}</code>
            ))}
          </div>
        </motion.article>
      </section>
    </section>
  );
}

function RaceSignalChart({ round }: { round: RaceRound }) {
  const values = round.candles.map((candle) => candle.close).reverse();
  const highs = round.candles.map((candle) => candle.high);
  const lows = round.candles.map((candle) => candle.low);
  const max = Math.max(...highs);
  const min = Math.min(...lows);
  const points = values.map((value, index) => {
    const x = (index / Math.max(values.length - 1, 1)) * 100;
    const y = max === min ? 50 : 100 - ((value - min) / (max - min)) * 100;
    return `${x},${y}`;
  });
  const trendUp = values[values.length - 1] >= values[0];

  return (
    <div className="signal-chart-card">
      <div className="signal-chart-head">
        <div>
          <span className="section-kicker">Signal chart</span>
          <strong>Micro round momentum</strong>
        </div>
        <em className={trendUp ? "positive" : "negative"}>
          {trendUp ? "Uptrend bias" : "Downtrend bias"}
        </em>
      </div>
      <div className="signal-chart-frame">
        <div className="signal-chart-grid" aria-hidden="true" />
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="signal-chart-svg" role="img" aria-label="BTC micro round chart">
          <defs>
            <linearGradient id="signalGradient" x1="0%" x2="100%" y1="0%" y2="0%">
              <stop offset="0%" stopColor="#ff5f6d" />
              <stop offset="45%" stopColor="#ffb56b" />
              <stop offset="100%" stopColor="#56f0b4" />
            </linearGradient>
          </defs>
          <polyline
            fill="none"
            stroke="url(#signalGradient)"
            strokeWidth="2.4"
            strokeLinejoin="round"
            strokeLinecap="round"
            points={points.join(" ")}
          />
        </svg>
      </div>
      <div className="signal-chart-foot">
        <span>Low {formatPrice(min)}</span>
        <span>High {formatPrice(max)}</span>
        <span>Last {formatPrice(round.price.last)}</span>
      </div>
    </div>
  );
}

function RoundPanel({
  activeGame,
  liveRound,
  hasContract,
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
  hasContract: boolean;
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
    <motion.article
      className="game-card round-panel"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.45, delay: 0.12 }}
    >
      <div className="panel-topline">
        <div>
          <h2>{assetTitle}</h2>
          <span className="asset-badge">{activeGame.asset}</span>
          <div className={hasContract ? "execution-badge live" : "execution-badge session"}>
            {hasContract ? "Onchain mode" : "Session mode"}
          </div>
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
            <motion.button
              key={choice.label}
              type="button"
              className={selectedCall === choice.label ? `call-button ${choice.tone} active` : `call-button ${choice.tone}`}
              onClick={() => onSelectCall(choice.label)}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.985 }}
            >
              <span>
                {choice.tone === "positive" ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                {choice.label}
              </span>
              <em>{callPool?.[choice.label] ? `${callPool[choice.label]}% pool` : "live"}</em>
            </motion.button>
          ))}
        </div>
      </div>

      <button type="button" className="enter-button" disabled={!selectedCall || tradeBusy} onClick={onEnterRound}>
        {tradeBusy ? (hasContract ? "Submitting onchain..." : "Queueing locally...") : hasContract ? "Enter Round" : "Enter Session Round"}
      </button>
      <button type="button" className="secondary-button" disabled={resolveBusy} onClick={onResolveRound}>
        {resolveBusy ? (hasContract ? "Resolving..." : "Resolving locally...") : hasContract ? "Resolve Round" : "Resolve Session Round"}
      </button>
      <p className="panel-note">{contractStatus}</p>
    </motion.article>
  );
}

function BalanceCard({ balance, walletAddress }: { balance: string; walletAddress: string }) {
  return (
    <motion.article
      className="game-card balance-card"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.45, delay: 0.18 }}
    >
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
    </motion.article>
  );
}

function RelatedMarkets({
  activeCategory,
  activeGame,
  onSelect
}: {
  activeCategory: (typeof categoryItems)[number];
  activeGame: GameId;
  onSelect: (value: GameId) => void;
}) {
  const items = marketDirectory
    .filter((item) => item.id !== activeGame && (activeCategory === "Trending" || item.category === activeCategory))
    .slice(0, 5);

  return (
    <motion.article
      className="game-card side-leaderboard"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.45, delay: 0.24 }}
    >
      <div className="section-kicker">Related markets</div>
      {items.map((item) => (
        <button key={item.title} type="button" className="related-market" onClick={() => onSelect(item.id)}>
          <div>
            <strong>{item.title}</strong>
            <span>{item.category} • {item.volume}</span>
          </div>
          <div className="related-market-meta">
            <em>{item.chance}</em>
            <ChevronRight size={16} />
          </div>
        </button>
      ))}
    </motion.article>
  );
}

function MarketBrowser({
  activeCategory,
  activeGame,
  onSelect
}: {
  activeCategory: (typeof categoryItems)[number];
  activeGame: GameId;
  onSelect: (value: GameId) => void;
}) {
  const items = marketDirectory.filter((item) => activeCategory === "Trending" || item.category === activeCategory);

  return (
    <motion.section
      className="game-card market-browser"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.22 }}
    >
      <div className="browser-head">
        <div>
          <span className="section-kicker">Market browser</span>
          <h3>{activeCategory === "Trending" ? "Live prediction board" : `${activeCategory} markets`}</h3>
        </div>
        <div className="browser-chip">{items.length} live markets</div>
      </div>

      <div className="market-grid">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className={item.id === activeGame ? "market-card active" : "market-card"}
            onClick={() => onSelect(item.id)}
          >
            <div className="market-card-top">
              <span>{item.category}</span>
              <strong>{item.chance}</strong>
            </div>
            <h4>{item.title}</h4>
            <div className="market-card-outcomes">
              <span className="yes">Yes</span>
              <span className="no">No</span>
            </div>
            <div className="market-card-foot">
              <em>{item.volume} Vol.</em>
              <span>{baseGames.find((game) => game.id === item.id)?.asset}</span>
            </div>
          </button>
        ))}
      </div>
    </motion.section>
  );
}

function SystemPanel({
  activeGame,
  contractStatus,
  hasContract,
  liveRound,
  walletAddress,
  walletLabel
}: {
  activeGame: GameMode;
  contractStatus: string;
  hasContract: boolean;
  liveRound: LiveRound | null;
  walletAddress: string;
  walletLabel: string;
}) {
  const rows = [
    { label: "Network", value: `${STUDIO_NETWORK_NAME} / chain 61999` },
    { label: "Active deck", value: `${activeGame.label} / ${activeGame.asset}` },
    { label: "RPC", value: STUDIO_RPC_URL },
    { label: "Evidence source", value: liveRound?.source ?? "Syncing live source" },
    { label: "Sync status", value: liveRound?.updatedAt ? `Updated ${formatUpdateTime(liveRound.updatedAt)}` : "Waiting for first sync" },
    { label: "Wallet session", value: walletAddress ? shortAddress(walletAddress) : "Disconnected" },
    { label: "Wallet network", value: walletLabel }
  ];

  return (
    <motion.article
      className="game-card system-panel"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.45, delay: 0.21 }}
    >
      <div className="section-kicker">Command center</div>
      <div className="system-status-banner">
        <span>Execution status</span>
        <strong>{contractStatus}</strong>
        <em>{hasContract ? "Live contract path enabled" : "Local execution path enabled"}</em>
      </div>
      <div className="system-rows">
        {rows.map((row) => (
          <div key={row.label} className="system-row">
            <span>{row.label}</span>
            <strong>{row.value}</strong>
          </div>
        ))}
      </div>
    </motion.article>
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
    <motion.article
      className="game-card bottom-panel"
      initial={{ opacity: 0, y: 26 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.26 }}
    >
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
            <span>Time / Tx</span>
          </div>
          {positions.map((position) => (
            <div key={`${position.id}-${position.time}`} className="positions-row">
              <span>{position.game}</span>
              <span>{position.asset}</span>
              <span>{position.pick}</span>
              <span>{position.size}</span>
              <span className="pending">{position.status}</span>
              <span>{position.id}</span>
              <span>{position.txHash ? `${position.time} • ${shortHash(position.txHash)}` : position.time}</span>
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
    </motion.article>
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
  if (liveRound?.type === "generic") return liveRound.evidence;
  return activeGame.evidenceHint;
}

function extractEvidenceUrls(liveRound: LiveRound | null) {
  if (!liveRound) return [];
  return liveRound.evidenceUrls;
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
    <div key="evidence" className="detail-tile">
      <span className="section-kicker">Evidence</span>
      <p>{extractEvidence(activeGame, liveRound)}</p>
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

function buildTickerItems(
  activeGame: GameMode,
  liveRound: LiveRound | null,
  walletAddress: string,
  contractStatus: string
): TickerItem[] {
  const base: TickerItem[] = [
    { label: "Deck", value: `${activeGame.label} / ${activeGame.asset}` },
    { label: "Source", value: liveRound?.source ?? "Syncing" },
    { label: "Wallet", value: walletAddress ? shortAddress(walletAddress) : "Not connected" }
  ];

  if (liveRound?.type === "race") {
    return [
      { label: liveRound.asset, value: formatPrice(liveRound.price.last) },
      { label: "24h volume", value: formatCompactUsd(liveRound.price.volume) },
      { label: "Bid / Ask", value: `${formatPrice(liveRound.price.bid)} / ${formatPrice(liveRound.price.ask)}` },
      ...base
    ];
  }

  return [
    { label: "Execution", value: contractStatus.length > 44 ? `${contractStatus.slice(0, 44)}...` : contractStatus },
    ...base
  ];
}

function buildSpotlightMetrics(activeGame: GameMode, liveRound: LiveRound | null) {
  if (liveRound?.type === "race") {
    return [
      { label: "Last price", value: formatPrice(liveRound.price.last) },
      { label: "To beat", value: formatPrice(liveRound.price.toBeat) },
      { label: "Bid depth", value: liveRound.depth.bidDepth.toFixed(3) },
      { label: "Ask depth", value: liveRound.depth.askDepth.toFixed(3) }
    ];
  }

  if (liveRound?.type === "news-pulse") {
    return [
      { label: "Headlines", value: String(liveRound.headlines.length) },
      { label: "Primary source", value: liveRound.headlines[0]?.source ?? "News" },
      { label: "Updated", value: formatUpdateTime(liveRound.updatedAt) },
      { label: "Mode", value: "Confirmation" }
    ];
  }

  if (liveRound?.type === "build") {
    return [
      { label: "Live repos", value: String(liveRound.candidates.length) },
      { label: "Top repo", value: liveRound.candidates[0]?.name ?? "N/A" },
      { label: "Stars", value: String(liveRound.candidates[0]?.stars ?? 0) },
      { label: "Updated", value: formatUpdateTime(liveRound.updatedAt) }
    ];
  }

  if (liveRound?.type === "judge") {
    return [
      { label: "Open disputes", value: String(liveRound.issues.length) },
      { label: "Evidence class", value: "GitHub issues" },
      { label: "Top issue", value: `${liveRound.issues[0]?.comments ?? 0} comments` },
      { label: "Updated", value: formatUpdateTime(liveRound.updatedAt) }
    ];
  }

  return [
    { label: "Mode", value: activeGame.label },
    { label: "Evidence", value: liveRound?.source ?? "Public source" },
    { label: "Updated", value: liveRound?.updatedAt ? formatUpdateTime(liveRound.updatedAt) : "Waiting" },
    { label: "Status", value: activeGame.liveEnabled ? "Live" : "Ready" }
  ];
}
