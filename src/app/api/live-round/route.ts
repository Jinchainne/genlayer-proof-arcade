import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    cache: "no-store",
    headers: {
      accept: "application/json",
      "user-agent": "GenLayerProofArcade/1.0",
      ...(init?.headers ?? {})
    }
  });
  if (!response.ok) throw new Error(`${url} failed with ${response.status}`);
  return response.json() as Promise<T>;
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      accept: "application/rss+xml, application/xml, text/xml",
      "user-agent": "GenLayerProofArcade/1.0"
    }
  });
  if (!response.ok) throw new Error(`${url} failed with ${response.status}`);
  return response.text();
}

function compactText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function stripHtml(value: string) {
  return compactText(value.replace(/<[^>]*>/g, " "));
}

async function loadRaceRound() {
  const [ticker, depth, klines] = await Promise.all([
    fetchJson<any>("https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT"),
    fetchJson<any>("https://api.binance.com/api/v3/depth?symbol=BTCUSDT&limit=8"),
    fetchJson<any[]>("https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1m&limit=12")
  ]);

  const lastPrice = Number(ticker.lastPrice);
  const openPrice = Number(ticker.openPrice);
  const bid = Number(ticker.bidPrice);
  const ask = Number(ticker.askPrice);
  const changePercent = Number(ticker.priceChangePercent);
  const toBeat = Number(klines[klines.length - 2]?.[4] ?? ticker.prevClosePrice);
  const candles = klines.map((candle) => ({
    open: Number(candle[1]),
    high: Number(candle[2]),
    low: Number(candle[3]),
    close: Number(candle[4]),
    volume: Number(candle[5])
  }));
  const bidDepth = (depth.bids ?? []).reduce((sum: number, [_, qty]: [string, string]) => sum + Number(qty), 0);
  const askDepth = (depth.asks ?? []).reduce((sum: number, [_, qty]: [string, string]) => sum + Number(qty), 0);
  const poolBase = bidDepth + askDepth || 1;

  return {
    type: "race",
    updatedAt: new Date().toISOString(),
    source: "Binance",
    asset: "BTC/USD",
    status: "LOCKED CURRENT ROUND",
    timer: {
      lockSeconds: 24,
      finishSeconds: 84
    },
    price: {
      last: lastPrice,
      toBeat,
      changePercent,
      open: openPrice,
      bid,
      ask,
      volume: Number(ticker.quoteVolume)
    },
    candles,
    depth: {
      bidDepth,
      askDepth
    },
    callPool: {
      MOON: Math.max(2, Math.round((bidDepth / poolBase) * 16)),
      PUMP: Math.max(4, Math.round((bidDepth / poolBase) * 22)),
      HIGHER: Math.max(8, Math.round((bidDepth / poolBase) * 28)),
      LOWER: Math.max(8, Math.round((askDepth / poolBase) * 25)),
      DUMP: Math.max(4, Math.round((askDepth / poolBase) * 19)),
      CRASH: Math.max(2, Math.round((askDepth / poolBase) * 10))
    }
  };
}

async function loadNewsRound() {
  const [coinDeskRss, coinTelegraphRss] = await Promise.all([
    fetchText("https://feeds.feedburner.com/CoinDesk"),
    fetchText("https://cointelegraph.com/rss")
  ]);
  const coinDeskItems = parseRssItems(coinDeskRss).slice(0, 3);
  const coinTelegraphItems = parseRssItems(coinTelegraphRss).slice(0, 3);
  const combined = [...coinDeskItems, ...coinTelegraphItems]
    .map((item) => ({
      title: compactText(item.title || "Headline"),
      link: item.link || "",
      source: item.creator?.includes("Cointelegraph") ? "Cointelegraph" : item.link?.includes("coindesk") ? "CoinDesk" : "News"
    }))
    .slice(0, 4);

  return {
    type: "news-pulse",
    updatedAt: new Date().toISOString(),
    source: "CoinDesk + Cointelegraph",
    headline: combined[0]?.title ?? "No headline",
    challenge: combined[1]?.title ?? "Waiting for public confirmation",
    headlines: combined,
    evidence: "Official blog posts, governance pages, and exchange notices determine confirmation."
  };
}

function parseRssItems(xml: string) {
  const items = Array.from(xml.matchAll(/<item>([\s\S]*?)<\/item>/g));
  return items.map(([, block]) => ({
    title: decodeXml(captureTag(block, "title")),
    link: decodeXml(captureTag(block, "link")),
    creator: decodeXml(captureTag(block, "creator") || captureTag(block, "dc:creator"))
  }));
}

function captureTag(block: string, tag: string) {
  const match = block.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match?.[1] ?? "";
}

function decodeXml(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

async function loadBuildRound() {
  const repos = await fetchJson<any[]>(
    "https://api.github.com/orgs/genlayerlabs/repos?per_page=6&sort=updated",
    { headers: { accept: "application/vnd.github+json" } }
  );
  const candidates = repos.slice(0, 4).map((repo) => ({
    name: repo.name,
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    updatedAt: repo.updated_at,
    description: compactText(repo.description ?? "No description")
  }));

  return {
    type: "build",
    updatedAt: new Date().toISOString(),
    source: "GitHub / genlayerlabs",
    challenge: "Which live GenLayer repository currently shows the strongest public traction and freshness?",
    candidates
  };
}

async function loadJudgeRound() {
  const issues = await fetchJson<any[]>(
    "https://api.github.com/repos/genlayerlabs/genlayer/issues?state=open&per_page=4",
    { headers: { accept: "application/vnd.github+json" } }
  );
  const liveIssues = issues
    .filter((issue) => !issue.pull_request)
    .slice(0, 3)
    .map((issue) => ({
      title: compactText(issue.title),
      url: issue.html_url,
      comments: issue.comments,
      body: stripHtml(issue.body ?? "").slice(0, 180)
    }));

  return {
    type: "judge",
    updatedAt: new Date().toISOString(),
    source: "GitHub / genlayerlabs",
    challenge: liveIssues[0]?.title ?? "No live issue",
    issues: liveIssues,
    evidence: "Issue body, reproduction steps, and linked references act as live public evidence."
  };
}

export async function GET(request: NextRequest) {
  const game = request.nextUrl.searchParams.get("game") ?? "race";

  try {
    if (game === "race" || game === "flip") {
      return NextResponse.json(await loadRaceRound());
    }
    if (game === "news-pulse") {
      return NextResponse.json(await loadNewsRound());
    }
    if (game === "build") {
      return NextResponse.json(await loadBuildRound());
    }
    if (game === "judge") {
      return NextResponse.json(await loadJudgeRound());
    }

    return NextResponse.json({
      type: "generic",
      updatedAt: new Date().toISOString(),
      source: "Live shell",
      challenge: "This game mode is waiting for a dedicated live resolver feed.",
      evidence: "MVP uses the shared GenLayer contract adapter and public sources."
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Live round request failed";
    return NextResponse.json(
      {
        error: message
      },
      { status: 500 }
    );
  }
}
