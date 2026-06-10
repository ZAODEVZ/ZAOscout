# Roadmap: the capture -> synthesize -> distribute loop

ZAOscout v1 ships the **capture** layer (the keyless fetchers + the mining workflow). The larger idea is a media-intelligence loop: capture good information from media, synthesize it once, and distribute it everywhere - so what you read compounds instead of evaporating.

```
  forward / mine  ->  fetch FULL (the keyless fetchers + ingest)  ->  synthesize
       ^                                                                |
       |                                                                v
   more reach   <-   distribute (socials / newsletter / graph)   <-  route by value
```

## Stage 1 - Capture (shipped)

- **Pull:** point `scout` at any Reddit/X/Farcaster URL.
- **Push:** `workflows/mine.js` fans out semantic search across a list of authors/topics and returns the highest-signal articles + threads. This is how you keep the top of the funnel full without forwarding links by hand.
- **Media:** pair with any local transcription tool to turn a podcast/video into text (ZAOscout leaves this pluggable).

## Stage 2 - Synthesize (your call)

Route each capture to the right store by type:

- **Deep synthesis** (a talk, a comparison, a decision) -> a markdown research doc.
- **A queryable fact** ("what did X say about Y") -> a knowledge-graph episode / vector store.
- **A durable correction** ("never do Z") -> a memory file your agent loads each session.

The pattern (from Anthropic's own skill guidance): anything written down in a standard format is usable by a future agent. Typed folders - people / companies / projects / operations - that the agent reads first and writes back to, compound over weeks.

## Stage 3 - Distribute (your call)

Make distribution a routing layer, not a manual chore. A synthesis worth sharing should auto-draft to your social + newsletter surfaces, queued for one-tap approval (not auto-posted). Distributed content attracts the next round of captures - that's what closes the loop.

## Why a loop, not a pipeline

A pipeline runs once and stops. A loop sustains itself: distribution brings reach, reach brings more forwards and follows, those feed the next capture, and the mining workflow keeps the funnel full even when you're heads-down. ZAOscout gives you the capture engine; wire stages 2 and 3 to the stores and surfaces you already use.
