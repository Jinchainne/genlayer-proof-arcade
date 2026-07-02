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
    fetchJson<any>("https://api.exchange.coinbase.com/products/BTC-USD/stats"),
    fetchJson<any>("https://api.exchange.coinbase.com/products/BTC-USD/book?level=2"),
    fetchJson<any[]>("https://api.exchange.coinbase.com/products/BTC-USD/candles?granularity=60")
  ]);

  const bids = Array.isArray(depth.bids) ? depth.bids.slice(0, 8) : [];
  const asks = Array.isArray(depth.asks) ? depth.asks.slice(0, 8) : [];
  const lastPrice = Number(ticker.last);
  const openPrice = Number(ticker.open);
  const bid = Number(bids[0]?.[0] ?? lastPrice);
  const ask = Number(asks[0]?.[0] ?? lastPrice);
  const changePercent = openPrice ? ((lastPrice - openPrice) / openPrice) * 100 : 0;
  const toBeat = Number(klines[1]?.[4] ?? openPrice);
  const candles = klines.slice(0, 12).map((candle) => ({
    open: Number(candle[3]),
    high: Number(candle[2]),
    low: Number(candle[1]),
    close: Number(candle[4]),
    volume: Number(candle[5])
  }));
  const bidDepth = bids.reduce((sum: number, [_, qty]: [string, string]) => sum + Number(qty), 0);
  const askDepth = asks.reduce((sum: number, [_, qty]: [string, string]) => sum + Number(qty), 0);
  const poolBase = bidDepth + askDepth || 1;

  return {
    type: "race",
    updatedAt: new Date().toISOString(),
    source: "Coinbase Exchange",
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
      volume: Number(ticker.volume) * lastPrice
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

async function loadDocHuntRound() {
  const html = await fetchText("https://ustr.gov/about-us/policy-offices/press-office/press-releases");
  const matches = Array.from(
    html.matchAll(/<li[^>]*>\s*(\d{4}-\d{2}-\d{2})\s*<br><a href="([^"]+)">\s*([^<]+?)\s*<\/a>/gi)
  )
    .slice(0, 4)
    .map(([, date, href, title]) => ({
      date,
      href: href.startsWith("http") ? href : `https://ustr.gov${href}`,
      title: compactText(decodeXml(title))
    }));

  const lead = matches[0];
  const challenge = lead
    ? `Review the latest USTR trade notice: "${lead.title}". Which issue category best matches this filing or action notice?`
    : "Review the latest public trade filing and classify the document issue.";

  return {
    type: "generic",
    updatedAt: new Date().toISOString(),
    source: "USTR press releases",
    challenge,
    evidence: matches.length
      ? matches.map((item) => `${item.date} - ${item.title}`).join(" | ")
      : "Official USTR notices and public trade policy releases act as evidence."
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
    "https://api.github.com/repos/genlayerlabs/genlayer-studio/issues?state=open&per_page=4",
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
    evidence: "Open issues from genlayer-studio, their reproduction steps, and linked references act as live public evidence."
  };
}

async function loadRollRound() {
  const [ticker, depth] = await Promise.all([
    fetchJson<any>("https://api.exchange.coinbase.com/products/ETH-USD/stats"),
    fetchJson<any>("https://api.exchange.coinbase.com/products/ETH-USD/book?level=2")
  ]);

  const bids = Array.isArray(depth.bids) ? depth.bids.slice(0, 6) : [];
  const asks = Array.isArray(depth.asks) ? depth.asks.slice(0, 6) : [];
  const lastPrice = Number(ticker.last);
  const openPrice = Number(ticker.open);
  const changePercent = openPrice ? ((lastPrice - openPrice) / openPrice) * 100 : 0;
  const bidDepth = bids.reduce((sum: number, [_, qty]: [string, string]) => sum + Number(qty), 0);
  const askDepth = asks.reduce((sum: number, [_, qty]: [string, string]) => sum + Number(qty), 0);

  return {
    type: "generic",
    updatedAt: new Date().toISOString(),
    source: "Coinbase Exchange / ETH-USD",
    challenge: `ETH is ${changePercent >= 0 ? "up" : "down"} ${Math.abs(changePercent).toFixed(2)}% from open at ${lastPrice.toFixed(2)} USD. Which risk lane best matches the current volatility band?`,
    evidence: `Open ${openPrice.toFixed(2)} | Last ${lastPrice.toFixed(2)} | Top-of-book depth ${bidDepth.toFixed(2)} bid vs ${askDepth.toFixed(2)} ask.`
  };
}

async function loadSpinRound() {
  const repos = await fetchJson<any[]>(
    "https://api.github.com/orgs/genlayerlabs/repos?per_page=8&sort=updated",
    { headers: { accept: "application/vnd.github+json" } }
  );
  const fresh = repos[0];
  const backups = repos.slice(1, 4).map((repo) => repo.name).join(", ");

  return {
    type: "generic",
    updatedAt: new Date().toISOString(),
    source: "GitHub / genlayerlabs",
    challenge: fresh
      ? `Daily spin challenge: will ${fresh.name} remain the freshest public GenLayer repo update through the current round window?`
      : "Daily spin challenge is waiting for a public repo freshness signal.",
    evidence: fresh
      ? `Latest repo: ${fresh.name} | Stars ${fresh.stargazers_count} | Forks ${fresh.forks_count} | Other active repos: ${backups}.`
      : "Public GitHub repo freshness and activity decide the daily spin."
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
    if (game === "doc-hunt") {
      return NextResponse.json(await loadDocHuntRound());
    }
    if (game === "judge") {
      return NextResponse.json(await loadJudgeRound());
    }
    if (game === "roll") {
      return NextResponse.json(await loadRollRound());
    }
    if (game === "spin") {
      return NextResponse.json(await loadSpinRound());
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
