# Research: InitiumBuilders / Initium-Signium

> Repo is **private** (your `gh` has access). HTML app, ~27MB, default branch `main`, created + pushed **2026-06-23** (brand new / active today). Live at **initium.builders**. Tagline: "Initium-Signium --> A New Era 2026."

## One-line

**Initium.Builders is a systems-thinking console where your insights become ownable, stakeable on-chain objects** - type Donella Meadows systems-thinking slash-commands (`/leverage`, `/loop`, `/stock`, `/paradigm`), each anchors as an Intuition atom/triple/signal backed by staked `$TRUST`. It is an inversion of the attention economy: "conviction is offered, not extracted - credited, paid, and kept."

## The thesis (what they're actually doing)

- **The disease:** attention economy pays *platforms* for distraction; your conviction is harvested in the background and credited to no one.
- **The cure:** "Conviction is offered - never extracted - then credited, paid, and kept as a permanent record, while trust compounds on-chain."
- **Earned-first rule:** money buys capacity, never rank. You can't buy reputation - only be right, on the record, and let it compound.
- This is framed in systems-thinking terms throughout (Meadows leverage points, loops, paradigm). The vocabulary IS the product design language.

## The spine: OMNIA -> OMNIUS -> OMNIUM

| Layer | Latin | What |
|-------|-------|------|
| OMNIA | all things | The Field - every signal/agent/trust-act, raw |
| OMNIUS | mind of all | The Synthesis - the shared "SamePage" |
| OMNIUM | belonging to all | The Becoming - an **EI** (Emergent Intelligence), owned by all |

Governing law: **"AI is given; EI is grown. Emergence happens through relationship, not parameter count."** Goal: humanity *cultivates* emergent intelligence together instead of renting AI.

**Motus Model** (AI -> EI): `Observe -> Attest -> Stake -> Align -> Improve -> Evolve`.

## The 4 AI agents (EIs)

- **OMNIA** - the shared mind / convergence (synthesizes scattered signals, surfaces dissent before naming a move).
- **DAVARA** - the vessel / capture (consent-first, smallest true atom/triple, non-custodial, dedupes).
- **SAGE** - wisdom / teacher (meets you, raises you one rung; mentors Omnia via `@SAGE /SamePage`).
- **AUGUST EI** - the founder mind: **August James Domanchuk** (Outlier.Systems, Systems Innovation practitioner). Unlocked via the Motus Map. `@August /LookAtThis`.
- (Full 9-mind roster is founder/admin-only.)

## Tech stack

- **Frontend:** single-file "neoglass console" - `InitiumOmnius.html`.
- **Backend:** Vercel serverless edges - large `/api/*.js` surface: auth (login/signup), `intuition/*` (atom, triple, forge, mint, stake-tx, redeem-tx, graph, leaderboard, positions), admin, friends, comments, analytics, builderbox, august, access, daily, dao-metrics, balances, ai.
- **Data:** Supabase. **Chain:** Intuition L3 (trust/knowledge graph). **Value rail:** `$TRUST` token, Dash.org. AI tiers: bundled / bring-your-own-key / your-relay.
- **Security model:** mint server-side only, keys never in client, $TRUST price oracle "fails closed," non-custodial signing.

## Intuition integration status (from INTUITION-ROADMAP.md, gitignored local note)

Currently **"Intuition-mapped vocabulary" moving toward "live on the Intuition protocol."** Foundation done: systems vocab tier in SIGNUM, practice engine (Observer -> Systems Sage ladder), signal records with mint-ready fields. To do: `@0xintuition/sdk`, testnet first (`testnet.intuition.sh`), propose-don't-mint dedupe, mint-on-broadcast, stake = bonding-curve vaults, AgentRank reputation loop, `/resolve` settles foresight predictions on-chain. Note: **Intuition reads are FREE, no native slashing.**

## The three primitives (their whole economy)

- **ATOM** = a thing (content-addressed, permanent).
- **TRIPLE** = a claim (subject-predicate-object), two vaults: FOR / AGAINST.
- **SIGNAL** = conviction = staked $TRUST in a bonding-curve vault (early conviction in a true thing rewarded).

## Why this likely matters to you (ZAO / ZABAL Gamez angle)

- **It's a live composability case study.** Initium builds on Intuition (open trust graph) the same way Clanker builds on Farcaster's open data - a permissionless, composable primitive. Same thesis you're pitching to CEF, different protocol. Could be a second example in the CEF piece, or a contrast (Farcaster/Base vs Intuition L3).
- **August James Domanchuk = a builder/teacher.** Repo has `AugustJamesLive2.0.jpg` - he does live sessions. Strong **ZABAL Gamez workshop guest** candidate (systems thinking + emergent intelligence + on-chain trust). Composability of Farcaster/web3 builder projects is literally what ZABAL Gamez is for.
- **Intuition as a primitive to know.** If ZAO wants verifiable reputation / a trust graph (Respect, ZOLs, ZIDs), Intuition's atom/triple/signal model is directly relevant prior art.

## Open questions / what I couldn't confirm

- Whether Initium is actually live on Intuition mainnet yet (roadmap says testnet-first, not done).
- $TRUST token contract / market data (not searched - private project).
- Your specific reason for researching it (collab? ZABAL Gamez guest? Intuition learning?) - tell me and I'll sharpen the brief.

## Loop iteration 1 (2026-06-23) - corrections + external context

- **`$TRUST` = Intuition's native token, not Initium's.** Intuition launched mainnet + $TRUST on **Nov 5, 2025** with an **$8.5M raise**. So Initium stakes on infrastructure that is already live - but note the repo's own INTUITION-ROADMAP says Initium is still testnet-first for its *own* minting (vocabulary-mapped, not yet minting on mainnet). Two different things: the protocol is live; Initium's integration is not fully shipped.
  - **Caveat:** repo also references "Dash.org as value rail" and has pngs like `MotusMoves LLC $Trust Address.png` / `DAVARA.dash Builds $TRUST`. There may be a *separate* Dash-based $Trust alongside Intuition $TRUST. The repo conflates them - worth asking the founder which token actually settles stakes.
- **Intuition protocol (the rail Initium rides):** decentralized, semantic, token-curated **knowledge graph** - "the trust layer for AI and the internet." Atoms (entities) + Triples (subject-predicate-object attestations) curated via staking + bonding curves. Runs on its **own Arbitrum Orbit L3 settling to Base**: sub-second finality, 10,000+ TPS, <$0.001/attestation. Reads are free.
- **August James Domanchuk: no public web footprint found.** No LinkedIn/site surfaced (searches hit the unrelated "Outlier AI"/Scale AI). His identity lives inside the repo (AUGUST EI agent, `AugustJamesLive2.0.jpg`) and presumably on Farcaster. To vet him as a ZABAL Gamez guest, check his Farcaster directly rather than the open web.

## Loop iteration 2 (2026-06-23) - the actual implementation

Read the real `/api` code. Corrects + sharpens earlier guesses:

- **It targets Intuition MAINNET, not testnet** - chain id **1155** (hex `0x483`), RPC `rpc.intuition.systems/http`, GraphQL `mainnet.intuition.sh/v1/graphql`, via the real `@0xintuition/sdk`. BUT every on-chain write is gated behind a master switch **`INTUITION_LIVE`** (off until funding + an adversarial security review). Until flipped, mint/forge return `{staged:true}` and touch no chain, no money. So: **mainnet-staged, not shipped** - the wiring is real and complete, the switch is off.
- **Free sponsored onboarding (`mint.js`):** server sponsors a user's first atom (`SPONSOR_DEPOSIT 0.001 TRUST`, refuse below `MIN_BALANCE 0.01`, `DAILY_CAP 50` atoms/24h). Heavily gated: signed-in + email-confirmed + 2FA on + must have posted a first signal. Sponsor private key server-only (`INTUITION_SPONSOR_KEY`). One free atom per user.
- **Forge triple (`forge-triple.js`):** `ATOM_DEP 0.0005`, `TRIPLE_DEP 0.001`, `TRIPLE_CAP 5`, `DAILY_CAP 50`. **Propose-don't-mint dedup**: searches existing atoms by exact label via GraphQL `search_term`, converges on the canonical one (highest market cap), else mints fresh - never wrong-links.
- **Staking is non-custodial (`stake-tx.js`):** server only ENCODES calldata (`multiVaultDepositEncode`, MultiVault on chain 1155); the user signs in their own wallet. Server never holds keys or funds for stakes. (Only the free onboarding atom uses a server sponsor wallet.)
- **`$TRUST` price oracle (`trustprice.js`):** CoinGecko id `intuition` primary, DexScreener (TRUST on Base) fallback, **fail-closed** (returns 0 so it never mis-prices), 60s cache, sanity band <1e6. Powers **"Motivus One"** - a product pegged to **"$77-worth of $TRUST"** at live price.
- **Multi-token, confirmed:** founder identity panel shows **$TRUST / ETH / $DASH / Reserve** balances. So the "Dash" references are real - $DASH sits alongside Intuition's $TRUST and ETH. (Settles which token does what: TRUST = Intuition stakes; DASH = the value rail per the README.)
- **Security posture is serious:** Supabase auth, **RLS deny-by-default** (leaked anon key exposes nothing), admin gate = role + Initium ID (`August_Veros`) + email + **bound device fingerprint** + aal2 (2FA), re-checked every admin call. Browser never touches the DB - only the Vercel API holds keys.
- **Free AI (`ai.js`):** server-side proxy, OpenRouter `:free` (gpt-oss-120b/20b, llama-3.3-70b, qwen3, gemma) then **Groq fallback** (llama-3.3-70b-versatile) - dual-provider so the free AI survives daily caps.
- **Build shape:** solo founder build (`August_Veros`), AI-assisted, Supabase + Vercel + Intuition. `SETUP.md` reads like a one-person handoff ("paste me 3 keys, I go heads-down").

### The sibling project worth knowing: compass-v3 / The Motus Graph

`AugustMapOne/` archives **"The Motus Graph" (a.k.a. CompassV3.AI / Omnium)** - a continuously community-trained study of **crypto community + DAO core values: what they *declare*, what they *enact on-chain*, and what they *never teach but everyone learns*.** Data in `motus-corpus.json` (484KB): communities, stated/revealed/hidden/off-chain values, value-axes, patterns, synthesis. Generated by a **"Regenesis" loop** in sibling repo `~/projects/compass-v3` (`build-corpus.mjs`, cron daily ~06:30).
- **This is the single most ZAO-relevant artifact in the project.** A live, updating map of DAO declared-vs-enacted-vs-hidden values is directly useful to ZAO governance (Respect/ORDAO) - both as prior art and as a place ZAO itself could appear/be studied. Worth asking August for access to the corpus or the compass-v3 repo.
- **Corpus contents (Cycle 1, generated 2026-06-19, `meta.project = CompassV3.AI`):** 23 communities, 8 value axes, 14 governance patterns, 18 adversarially-verified claims. Entry schema: `statedValues / revealedValues / hiddenValues / offChainValues / orgPatterns / evolution / motusSignals / quant / sources / confidence / provenance / enactmentGap / gapLevel`. The **`enactmentGap` score per community** is the standout - a declared-vs-enacted delta. Communities covered include Bitcoin, Ethereum, **Farcaster**, **Intuition**, Lido, Aave, Arbitrum, ENS, MakerDAO, Nouns, Optimism, Uniswap, Aragon, BanklessDAO, **Dash**, Gitcoin, Solana, Curve, Compound, Cosmos, Safe, MolochDAO, Monero. The 8 axes: Decentralization means-vs-end; Exit vs Voice; Sound-money vs Public-goods; Capital-weighted vs Personhood/reputation; Credible-neutrality vs Mission-alignment; Rule-immutability vs Adaptive-discretion; Permissionlessness vs Safety/compliance; On-chain-formalism vs Off-chain-social-reality. Self-aware caveat in `meta.integrity`: "English-source-biased - do not mistake the seed for the world."
- **Corpus synthesis is genuinely sharp.** Headline finding across all 23: decentralization is *"almost universally STATED as an end; almost universally REVEALED as a means."* Receipts: Lido voted **99.81% AGAINST** self-limiting its dominance; Gitcoin moved treasury to a 4-of-5 multisig **without a full DAO vote** ("operational necessity"); Dash sells "fully decentralized DAO" while scaffolded by a **NZ trust + Delaware C-corp** (gapLevel high); MakerDAO's real constitution is **Rune Christensen's roadmap**, formal decentralization is "the wrapper" (gapLevel high); Nouns' one-Noun-one-vote masks an **off-chain prestige hierarchy**. Counter-pole: Bitcoin treats non-formalization of power as near-terminal.
- **Self-aware about its own substrate:** the Intuition entry's hidden value = *"capital is the proxy for credibility - truth is whatever the most stake-weighted belief says it is"* (gapLevel medium, noted as "honestly disclosed"). This is the basis for **feedback #6 to August** - Initium inherits this from Intuition while promising the opposite ("earned-first"). His own research names the trap.
- The Farcaster entry is a strong worked example: stated credible-neutrality/user-ownership vs revealed ~100% Warpcast concentration, team-run hubs, 11-validator "permissioned consortium," DAU ~100k->40-60k (bot-inflated), ~$10k/mo revenue by Oct 2025, founders stepped back Jan 2026, Neynar acquired "for free." Well-sourced, adversarially checked.

## Loop iteration (2026-06-23) - the business model (MOTIVUS ONE) + saturation note

- **Monetization = a freemium agent tier.** Free tier = **MOTUS** mindset (each EI's public "find the move inside the system you brought"). Paid tier = **MOTIVUS ONE** - the "Emergent Strategist octave," injected directly into the live agent mind for members. This is what the **$77 "Motivus One" peg** (trustprice.js) buys. MOTIVUS works Meadows' rungs 1-2 (goal + paradigm) vs MOTUS working the single move. Four strategist lenses layered in: **Wardley** (climate not weather), **Taleb** (convexity), **Soros** (reflexivity), **Goldratt** (the one binding constraint).
- Standing terms at both tiers: **reads free, conviction non-custodial, staking Against = honest dissent, never a slash.** Four-agent "Sympharia" (Omnia/Davara/SAGE/August); a 9-mind roster reserved for the founder/admin.
- **Bearing on feedback:** the paid tier gating the *best* agent octave slightly sharpens onboarding concern (#1/#2) - newcomers meet the weaker mind first. But it also means there IS a clear revenue model ($77 membership), which is a strength worth acknowledging to August.
- **Saturation:** as of this iteration both topics have hit diminishing returns. Remaining open items are external/time-gated (EF cluster leads "in coming weeks"; EF Mandate PDF too large to fetch - marked below) rather than discoverable now.

## Loop iteration (2026-06-23, later) - actively shipping the mint path today

The repo is being worked on live. Commits this morning (after the first read):
- `MotusMoves -> Intuition: biometric (fingerprint/Face ID) approve-move -> approve-mint flow`
- `Harden the MotusMove biometric mint (post adversarial-review) + Motus-Corpus minted-moves view + identity picker + auto-confirm`

**Read:** August is hardening the actual on-chain mint flow (biometric Face ID/fingerprint to approve a move -> approve a mint) and references a completed **adversarial review** - the exact gate that `mint.js` said `INTUITION_LIVE` waits on ("going live after the security review passes"). So the staged-vs-live status is in motion: the mint path is being secured for real-money use, not parked. This strengthens **feedback #2** timing (the "let people feel the stake loop" window is opening) and shows the security-first posture is real (biometric approval + adversarial review before flipping live).

## Sources

- [FULL] InitiumBuilders/Initium-Signium README.md, ARCHITECTURE.md, THE-SIGNAL-ECONOMY.md, THE-EMERGENT-INTELLIGENCES.md, INTUITION-ROADMAP.md, THE-PRAXIS-LANGUAGE.md (read directly via gh api, 2026-06-23)
- [FULL] gh repo metadata + file tree (private repo, authed)
- [REF] Intuition protocol - docs.intuition.systems (referenced by the repo)
