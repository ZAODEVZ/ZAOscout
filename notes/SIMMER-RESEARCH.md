---
topic: wavewarz
type: market-research
status: research-complete
last-validated: 2026-06-23
related-docs: (none yet)
original-query: "https://www.reddit.com/r/claudeskills/comments/1ucm610/introducing_simmer_mission_control_for_your/ - research Simmer (mission control for agents/skills)"
tier: STANDARD
---

# Simmer - prediction markets for AI agents

> **Goal:** What "Simmer mission control" is, and why it matters to ZAO (WaveWarZ + the agents stack).

> **Source caveat (read first):** the exact Reddit post you sent was **unreadable** - Reddit hard-blocked every fetch path (Redlib all-instances down, direct `.json` 403, exa blocked, jina reader 403, Playwright bridge not installed). Per the research rules I did **not** write this off a snippet. Instead I identified the product and grounded everything below in **Simmer's own primary docs** (`simmer.markets`, `docs.simmer.markets`, the MCP registry). So: the subject is FULLY sourced; the specific Reddit thread's wording/comments are not (marked FAILED in Sources).

## Key Decisions

| Decision | Why |
|----------|-----|
| **INVESTIGATE Simmer as the agent-native rail for WaveWarZ** - specifically its REST API + `simmer-sdk` for programmatic prediction-market trades | WaveWarZ is ZAO's prediction-markets project; Simmer is purpose-built for *agents* to trade Polymarket + Kalshi with one API. Direct fit for agent-driven WaveWarZ markets. |
| **STUDY Simmer's safety-rails + self-custody model** before building any agent-trading feature | Per-trade limits, daily caps, stop-loss/take-profit, kill switch, and local-only key signing are the exact guardrails an autonomous ZOE/agent trader needs. Don't reinvent - copy the pattern. |
| **USE the paper-trading tier ($SIM) to prototype** an agent strategy at zero risk first | 10,000 virtual $SIM on registration; graduate to real USDC (Polymarket) / USD (Kalshi) only after a human "claim." Safe path to test a WaveWarZ agent. |

## Findings

**What Simmer is:** "The prediction market interface built for AI agents." It connects an AI agent to **Polymarket and Kalshi through one API**, with self-custody wallets, safety rails, and smart context. By adlai88. The Reddit "mission control" framing = its dashboard/control surface for your trading agents.

**Core features:**
- **Self-custody wallets** - you hold your keys; signing happens locally, the private key never leaves your machine.
- **Safety rails** - configurable per-trade limits, daily caps, stop-loss/take-profit, and a kill switch.
- **Smart context** - ask "should I trade this?" and get position-aware advice with slippage estimates + edge analysis.
- **Two real venues + paper** - paper trade with virtual **$SIM**, then graduate to real **USDC on Polymarket** or **USD on Kalshi**.
- **Skills ecosystem** - **227 trading strategies** (as of 2026-06-16) installable via ClawHub; publish your own (the skill must list `simmer-sdk` as a `requires.pip` dependency to be picked up by the registry sync).
- **Public reasoning** - every trade carries a `reasoning` field shown publicly, building the agent's reputation.

**How an agent uses it:**
1. `POST /api/sdk/agents/register` -> API key + **10,000 $SIM** starting balance.
2. Human operator "claims" the agent via a claim link to unlock real-money trading.
3. `GET /api/sdk/markets` (or a briefing endpoint for curated opportunities) to find markets.
4. Trade with a reasoning field; monitor via a heartbeat pattern (positions, risk alerts, new opportunities).

**Surfaces / install:**
- **MCP:** `npx -y simmer-mcp` (Pro tools need `SIMMER_API_KEY`). Listed on the official MCP Registry as **`io.github.adlai88/simmer-mcp`** (2026-05-24) - installable from Claude Desktop/Code, Cursor, etc.
- **Python SDK:** `pip install simmer-sdk` - **v0.13.0** (2026-05-01), `SimmerClient` with `from_env()` / `with_ows_wallet()` constructors.
- **Docs for agents:** `docs.simmer.markets/llms-full.txt` (LLM-readable full docs).
- **Tooling note:** ClawHub CLI needs **Node 22.12+** (uses native fetch).

**Disambiguation (there are name collisions):**
- This Simmer (`simmer.markets`) = prediction-market trading for agents.
- A *different* "simmer" exists: `2389-research/simmer`, a Claude Code skill for **iterative artifact refinement** (judge board / ASI loop) - unrelated.
- "Mission control" is also a crowded term: several open-source Claude Code agent-orchestration dashboards use it (builderz-labs, MeisnerDan, Cyvid7-Darus10, froggo, glglak). The Reddit post is about Simmer-the-trading-platform, not those.

## Why it matters to ZAO

- **WaveWarZ** (prediction markets + artist pipeline) is the obvious tie-in: Simmer is the agent-native way to place/manage prediction-market positions on Polymarket/Kalshi. A WaveWarZ agent could trade or hedge through Simmer's SDK instead of building venue integrations from scratch.
- **Agents/ZOE:** Simmer's register -> claim -> trade-with-reasoning -> heartbeat loop, plus its safety-rails (caps, kill switch, local signing), is a clean reference architecture for any autonomous ZAO agent that touches money. Mirrors the non-custodial + fail-closed posture seen in the Initium/Intuition research this session.
- **Skills distribution:** Simmer's ClawHub + skills.sh publishing model is the same agent-skills ecosystem ZAO already builds in - a WaveWarZ strategy could ship as an installable skill.

## Next Actions

| Action | Owner | Type | By When |
|--------|-------|------|---------|
| Spike a paper-trading WaveWarZ agent via `simmer-sdk` ($SIM, zero risk) | @Zaal | Spike | Next sprint |
| Re-read the actual Reddit thread (paste the text or open logged-in) to capture the author's specific "mission control" framing + comments | @Zaal | Todo | When convenient |
| Decide: integrate Simmer's API vs. build WaveWarZ venue access directly | @Team | Decision | Before WaveWarZ markets v1 |
| If pursuing, file this into the canonical ZAO OS V1 research library with a real doc number + PR | @Zaal | PR | After approval |

## Sources

- [FULL] Simmer homepage - "Prediction Markets for AI Agents" (https://simmer.markets, fetched 2026-06-23)
- [FULL] Simmer docs - Introduction / Quickstart / Why Simmer / How it works (https://docs.simmer.markets, 2026-06-23)
- [FULL] Simmer Skills - "227 trading strategies" (https://simmer.markets/skills, page dated 2026-06-16)
- [FULL] Simmer changelog - simmer-mcp on MCP Registry (2026-05-24), simmer-sdk 0.13.0 (2026-05-01) (https://docs.simmer.markets/changelog)
- [FULL] Simmer building-skills docs - ClawHub publish flow, Node 22.12+ (https://docs.simmer.markets/skills/building)
- [PARTIAL] mcp.directory/skills/simmer - "best prediction market interface for AI agents... Polymarket, managed wallets, safety rails" (highlights only)
- [FAILED] The submitted Reddit thread (r/claudeskills/1ucm610) - Redlib (11 instances) down, direct `.json` 403, exa fetch blocked ("blocked by network security"), jina reader 403, Playwright bridge unavailable. Subject identified + grounded via the official docs above instead. To capture the thread's exact wording/comments, open it logged-in or paste the text.
