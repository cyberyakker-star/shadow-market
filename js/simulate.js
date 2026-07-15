import { MARKET_EVENTS } from "./data/templates.js";
import { pushLedger } from "./state.js";
import { mulberry32 } from "./generate.js";

const STRESS_MAX = 100;
const HEAT_MAX = 100;

function weightedEvent(rand) {
  const total = MARKET_EVENTS.reduce((s, e) => s + e.w, 0);
  let r = rand() * total;
  for (const e of MARKET_EVENTS) {
    r -= e.w;
    if (r <= 0) return e;
  }
  return MARKET_EVENTS[0];
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

/**
 * Advance simulation by one logical tick.
 * @returns {{ ended?: boolean, reason?: string, events: string[] }}
 */
export function tickOnce(state) {
  const player = state.player;
  if (!player || player.status === "collapsed" || player.status === "ascended") {
    return { ended: true, reason: player?.status, events: [] };
  }

  player.status = "running";
  player.tick = (player.tick || 0) + 1;
  const tick = player.tick;
  const rand = mulberry32((player.seed + tick * 9973) >>> 0);
  const events = [];

  // Ally revenue buff
  const allyCount = (state.modifiers.allyIds || []).length;
  const allyMult = 1 + allyCount * 0.06;

  // Active sabotage on player (from flavor — if many sabotaged relations reverse)
  let sabotageDebuff = 1;
  const hostile = (state.rivals || []).filter((r) => r.relation === "sabotaged").length;
  if (hostile > 2 && rand() < 0.15) {
    sabotageDebuff = 0.85;
    events.push("Residual sabotage static dampens revenue this cycle.");
  }

  const rev =
    player.metrics.revenuePerTick *
    (state.modifiers.revenueMult || 1) *
    allyMult *
    sabotageDebuff;
  const burn = player.metrics.burnPerTick * (state.modifiers.burnMult || 1);

  player.resources.capital = Math.round((player.resources.capital + rev - burn) * 10) / 10;
  player.resources.inventory = clamp(
    player.resources.inventory + (rand() > 0.5 ? 0.3 : -0.2),
    0,
    200
  );
  player.resources.stress = clamp(player.resources.stress + (burn > rev ? 0.4 : -0.15), 0, STRESS_MAX);
  player.metrics.marketShare = clamp(
    player.metrics.marketShare + (rev > burn ? 0.05 : -0.02) + allyCount * 0.01,
    0,
    100
  );
  player.metrics.heat = clamp(player.metrics.heat * 0.995, 0, HEAT_MAX);

  // Random market event ~18% per tick
  if (rand() < 0.18) {
    const ev = weightedEvent(rand);
    applyEffects(player, state, ev.effects);
    events.push(ev.text);
    pushLedger(state, ev.text, tick);
  }

  // Passive rival drift
  for (const r of state.rivals || []) {
    if (r.relation === "merged") continue;
    const rr = mulberry32((r.seed + tick * 13) >>> 0);
    r.resources.capital += (r.metrics.revenuePerTick - r.metrics.burnPerTick) * (0.8 + rr() * 0.4);
    r.tick = (r.tick || 0) + 1;
    if (r.relation === "ally") {
      r.resources.capital += rev * 0.05;
    }
    const until = state.modifiers.sabotageUntil?.[r.id];
    if (until && tick <= until) {
      r.metrics.revenuePerTick *= 0.92;
      r.resources.stress = clamp((r.resources.stress || 20) + 2, 0, STRESS_MAX);
    }
  }

  state.capitalHistory = [...(state.capitalHistory || []), player.resources.capital].slice(-48);

  // End conditions
  if (player.resources.capital <= 0) {
    player.status = "collapsed";
    player.resources.capital = 0;
    const msg = "Empire collapsed — capital hit zero inside the constraint.";
    pushLedger(state, msg, tick);
    events.push(msg);
    return { ended: true, reason: "collapsed", events };
  }
  if (player.resources.stress >= STRESS_MAX) {
    player.status = "collapsed";
    const msg = "Empire collapsed — stress maxed. The constraint ate the operator.";
    pushLedger(state, msg, tick);
    events.push(msg);
    return { ended: true, reason: "collapsed", events };
  }
  if (player.metrics.heat >= HEAT_MAX) {
    player.status = "collapsed";
    const msg = "Empire collapsed — heat too high. The shadow market noticed.";
    pushLedger(state, msg, tick);
    events.push(msg);
    return { ended: true, reason: "collapsed", events };
  }
  if (player.metrics.marketShare >= 35 && player.resources.reputation >= 60 && player.tick >= 40) {
    player.status = "ascended";
    const msg = "Empire ascended — your micro-system is the quiet standard in its niche.";
    pushLedger(state, msg, tick);
    events.push(msg);
    return { ended: true, reason: "ascended", events };
  }

  return { ended: false, events };
}

function applyEffects(player, state, effects) {
  if (!effects) return;
  const r = player.resources;
  const m = player.metrics;
  if (effects.capital) r.capital += effects.capital;
  if (effects.inventory) r.inventory = clamp(r.inventory + effects.inventory, 0, 200);
  if (effects.reputation) r.reputation = clamp(r.reputation + effects.reputation, 0, 100);
  if (effects.stress) r.stress = clamp(r.stress + effects.stress, 0, STRESS_MAX);
  if (effects.marketShare) m.marketShare = clamp(m.marketShare + effects.marketShare, 0, 100);
  if (effects.heat) m.heat = clamp(m.heat + effects.heat, 0, HEAT_MAX);
  if (effects.revenueMod) {
    m.revenuePerTick = Math.max(0.5, m.revenuePerTick * (1 + effects.revenueMod));
    state.modifiers.revenueMult = (state.modifiers.revenueMult || 1) * (1 + effects.revenueMod * 0.25);
  }
  if (effects.burnMod) {
    m.burnPerTick = Math.max(0.3, m.burnPerTick * (1 + effects.burnMod));
  }
}

export function formatSimTime(tick) {
  const hours = tick * 4; // 1 tick = 4 simulated hours
  const days = Math.floor(hours / 24);
  const h = hours % 24;
  if (days <= 0) return `${h}h sim`;
  return `${days}d ${h}h sim`;
}

export { STRESS_MAX, HEAT_MAX };
