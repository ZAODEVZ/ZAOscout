// Tier definitions + gating. Anon by default; claim with Farcaster OR ZAO Respect
// to upgrade. ZAO Respect (community loyalty) jumps you straight to the top tier.
export const TIERS = {
  anon:     { name: 'anon',     ratePerDay: 50,   maxSources: 6,   synthesis: false, recurring: false, memory: false },
  fc_basic: { name: 'fc_basic', ratePerDay: 300,  maxSources: 20,  synthesis: false, recurring: false, memory: true },
  fc_pro:   { name: 'fc_pro',   ratePerDay: 1500, maxSources: 50,  synthesis: true,  recurring: true,  memory: true },
  respect:  { name: 'respect',  ratePerDay: 5000, maxSources: 200, synthesis: true,  recurring: true,  memory: true },
};
// thresholds are env-tunable so you can calibrate without a redeploy
const FC_BASIC = Number(process.env.TIER_FC_BASIC_FOLLOWERS || 50);
const FC_PRO   = Number(process.env.TIER_FC_PRO_FOLLOWERS   || 1000);
const RESPECT_MIN = Number(process.env.TIER_RESPECT_MIN || 1);

export function tierFor({ fcFollowers = 0, fcScore = 0, respect = 0 }) {
  if (respect >= RESPECT_MIN) return TIERS.respect;          // any ZAO Respect -> top
  if (fcFollowers >= FC_PRO || fcScore >= 0.9) return TIERS.fc_pro;
  if (fcFollowers >= FC_BASIC) return TIERS.fc_basic;
  return TIERS.anon;
}
