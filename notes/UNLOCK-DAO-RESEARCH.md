# Research: Unlock DAO (Unlock Protocol)

> Quick brief. Topic = the DAO that governs **Unlock Protocol** - onchain memberships / subscriptions / access control (a "lock" deploys NFT "keys"). Relevant to ZAO because it's the canonical permissionless primitive for **gated communities + memberships** - exactly the problem ZAO solves with Respect/ZOLs/Farcaster gating.

## Key facts

- **What it governs:** Unlock Protocol - smart contracts where anyone deploys a "lock" (membership contract); buyers get a "key" (NFT) that grants access. No platform, no permission. Powers paywalls, event tickets, community gating, subscriptions.
- **Token: UP** (Unlock Protocol Token), formerly **UDT** (Unlock Discount Token). Swap ratio **1 UDT -> 1,000 UP**. DAO + treasury migrated from Ethereum mainnet to **Base** (July 2024 vote).
- **Distribution:** UP is auto-minted as a **reward on every paid membership purchase** on supported networks - usage mints governance power. (Similar spirit to CEF recycling fees to contributors.)
- **Governance mechanics:** OpenZeppelin **Governor + Timelock** on Base. 1 UP = 1 vote. **3,000,000 UP quorum** to pass. **Anyone can propose, no ownership threshold.** 2-day timelock before execution. Ideas float on Discord forum first, then onchain.
- **Grants:** UP Token Grants Program funds projects building on Unlock; grantees get a voice in the DAO. A **1.061M UP** bridge/swap airdrop ran post-migration (funded by the Unlock Protocol Foundation).

## Why it matters to ZAO

1. **Membership/gating prior art.** ZAO is a 188-member gated Farcaster community. Unlock is the most battle-tested onchain way to do locks/keys. If ZAO ever wants token-gated access beyond Farcaster follower checks, Unlock locks (NFT keys) are the standard - and they're on Base, where Clanker/ZABAL already live (composability).
2. **Permissionless + usage-mints-governance** mirrors your CEF thesis. Worth a name-drop in the composability article: Unlock (memberships), Clanker (tokens), Intuition (trust graph) are all permissionless Base/Farcaster-adjacent primitives that compose.
3. **Grants = funding path.** If ZAO builds anything on Unlock, the UP Grants Program is a real funding source.

## Decision / recommendation

- **USE Unlock locks** if ZAO needs onchain memberships/ticketing/paywalls beyond Farcaster gating - it's on Base, audited, and composable with the existing stack. **SKIP** if Farcaster-native gating (follower/channel checks via Haatz/Neynar) already covers the need - don't add a token contract you don't need.

## Open questions

- Your reason for researching Unlock DAO - governance study, a ZAO membership feature, or grant funding? Tell me and I sharpen this.
- Current UP price / treasury size (not pulled - say the word and I'll fetch live).

## Sources

- [FULL] Unlock Protocol docs - Governance & Voting (docs.unlock-protocol.com/governance/unlock-dao/)
- [FULL] Unlock Protocol docs - UP Token (docs.unlock-protocol.com/governance/unlock-dao-tokens)
- [FULL] Unlock blog - "From UDT to UP", "DAO Completes Migration to Base", "Cross-Chain Governance" (unlock-protocol.com/blog)
- [FULL] UP Token Grants Program (docs.unlock-protocol.com/governance/grants-bounties/udt-grants/)
