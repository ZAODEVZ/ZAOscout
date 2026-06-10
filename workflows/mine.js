// ZAOscout mining workflow - push-discovery of high-signal content from known authors.
//
// This runs in a Claude Code "Workflow" (the agent()/parallel()/phase() harness).
// It fans out one agent per author, each doing semantic search (exa) for that
// author's best content on a topic, then clusters the findings. Keyless - X
// timelines are walled (see docs/HOW-IT-WORKS.md), so this uses search, not feeds.
//
// To use: edit AUTHORS, then run this script via the Workflow tool. The findings
// come back as structured JSON you can write into your synthesis store (a research
// doc, a knowledge graph, etc.). NOTE: pass inputs by editing the file, not via
// `args` - in some runtimes the args global does not bind; hardcoding is reliable.

export const meta = {
  name: 'scout-mine',
  description: 'Mine high-signal articles/threads from a list of authors via semantic search',
  phases: [
    { title: 'Mine', detail: 'one agent per author: search + read top results' },
    { title: 'Cluster', detail: 'group findings by theme' },
  ],
}

// --- EDIT THIS: the authors/topics to mine ---
const AUTHORS = [
  { h: 'trq212', topic: 'Claude agents skills building' },
  { h: 'walden_yan', topic: 'context engineering multi-agent' },
  { h: '0xricker', topic: 'Opus Kimi agent swarm orchestration' },
]

const FINDING = { type:'object', properties:{
  author:{type:'string'}, found:{type:'boolean'},
  findings:{ type:'array', items:{ type:'object', properties:{
    title:{type:'string'}, url:{type:'string'}, theme:{type:'string'},
    signal:{type:'string'}, is_article:{type:'boolean'}
  }, required:['title','url','theme','signal'] } }
}, required:['author','found','findings'] }

function minePrompt(a) {
  return `Find the BEST agent/AI content from author @${a.h} (topics: ${a.topic}). ` +
    `Use the exa web_search tool with queries like "${a.h} ${a.topic} 2026 thread article". ` +
    `Read the top 1-2 substantive results with exa web_fetch. Return up to 4 findings, each: ` +
    `title, url, theme (short tag), signal (1-2 sentence takeaway), is_article (true for long-form). ` +
    `If nothing substantive, found=false. Prioritize SIGNAL over volume; skip generic fluff.`
}

phase('Mine')
const mined = await parallel(AUTHORS.map(a =>
  () => agent(minePrompt(a), { label:`mine:${a.h}`, phase:'Mine', schema: FINDING, model:'sonnet' })
))
const all = mined.filter(Boolean).filter(x=>x.found).flatMap(x => (x.findings||[]).map(f=>({...f, author:x.author})))
log(`mined ${all.length} findings from ${mined.filter(Boolean).filter(x=>x.found).length} authors`)

const CLUSTER = { type:'object', properties:{
  clusters:{ type:'array', items:{ type:'object', properties:{
    theme:{type:'string'}, title:{type:'string'}, summary:{type:'string'},
    items:{ type:'array', items:{ type:'object', properties:{
      author:{type:'string'}, title:{type:'string'}, url:{type:'string'}, signal:{type:'string'}
    }, required:['author','title','url','signal'] } }
  }, required:['theme','title','summary','items'] } },
  top_picks:{ type:'array', items:{type:'string'} }
}, required:['clusters'] }

phase('Cluster')
const clustered = await agent(
  `Cluster these ${all.length} findings into 3-6 themes. For each: theme, title, a 2-3 sentence ` +
  `cross-cutting summary, and its items. Also pick top_picks: the 3-5 highest-signal URLs worth a ` +
  `deep read.\n\nFindings: ${JSON.stringify(all)}`,
  { phase:'Cluster', schema: CLUSTER }
)

return { authorsMined: mined.filter(Boolean).filter(x=>x.found).length, totalFindings: all.length,
         clusters: clustered.clusters, top_picks: clustered.top_picks || [], raw: all }
