import { generateEmpire, ensureRivalPool, uid } from "./generate.js";
import { pushLedger } from "./state.js";

export function initRivals(state) {
  state.rivals = ensureRivalPool(state.rivals || [], 8);
  return state.rivals;
}

function findRival(state, id) {
  return (state.rivals || []).find((r) => r.id === id);
}

/**
 * Ally with a rival.
 */
export function allyWith(state, rivalId) {
  const player = state.player;
  const rival = findRival(state, rivalId);
  if (!player || !rival) return { ok: false, error: "Rival not found." };
  if (rival.relation === "merged") return { ok: false, error: "Already merged." };
  if (rival.relation === "ally") return { ok: false, error: "Already allied." };
  if (player.resources.capital < 25) return { ok: false, error: "Need ₡25 capital to open an alliance." };

  player.resources.capital -= 25;
  player.resources.reputation = Math.min(100, player.resources.reputation + 3);
  rival.relation = "ally";
  state.modifiers.allyIds = [...new Set([...(state.modifiers.allyIds || []), rival.id])];
  state.modifiers.revenueMult = (state.modifiers.revenueMult || 1) * 1.04;

  const outcome = `Allied with ${rival.handle}. Shared lanes open; +revenue mult.`;
  state.actions.push({ type: "ally", targetId: rival.id, outcome, tick: player.tick });
  pushLedger(state, outcome, player.tick);
  return { ok: true, outcome };
}

/**
 * Sabotage a rival.
 */
export function sabotage(state, rivalId) {
  const player = state.player;
  const rival = findRival(state, rivalId);
  if (!player || !rival) return { ok: false, error: "Rival not found." };
  if (rival.relation === "merged") return { ok: false, error: "Cannot sabotage a merged empire." };
  if (player.resources.capital < 20) return { ok: false, error: "Need ₡20 capital to fund sabotage." };

  player.resources.capital -= 20;
  player.metrics.heat = Math.min(100, player.metrics.heat + 8 + Math.random() * 10);
  player.resources.stress = Math.min(100, player.resources.stress + 5);

  rival.relation = "sabotaged";
  rival.resources.stress = Math.min(100, (rival.resources.stress || 20) + 20);
  rival.metrics.revenuePerTick *= 0.75;
  state.modifiers.allyIds = (state.modifiers.allyIds || []).filter((id) => id !== rival.id);
  state.modifiers.sabotageUntil = {
    ...(state.modifiers.sabotageUntil || {}),
    [rival.id]: (player.tick || 0) + 12,
  };

  // blowback chance
  let outcome = `Sabotaged ${rival.handle}. Their revenue clipped for ~12 ticks.`;
  if (Math.random() < 0.35) {
    player.resources.capital -= 30;
    player.metrics.heat = Math.min(100, player.metrics.heat + 12);
    outcome += " Blowback: heat + capital sting.";
  }

  state.actions.push({ type: "sabotage", targetId: rival.id, outcome, tick: player.tick });
  pushLedger(state, outcome, player.tick);
  return { ok: true, outcome };
}

/**
 * Merge with a rival — absorb capital slice + one blueprint.
 */
export function mergeWith(state, rivalId) {
  const player = state.player;
  const rival = findRival(state, rivalId);
  if (!player || !rival) return { ok: false, error: "Rival not found." };
  if (rival.relation === "merged") return { ok: false, error: "Already merged." };
  if (player.resources.capital < 40) return { ok: false, error: "Need ₡40 capital to fund a merge." };

  player.resources.capital -= 40;
  const absorbed = Math.max(15, Math.floor((rival.resources.capital || 50) * 0.25));
  player.resources.capital += absorbed;
  player.resources.stress = Math.min(100, player.resources.stress + 18);
  player.resources.reputation = Math.min(100, player.resources.reputation + 5);
  player.metrics.marketShare = Math.min(100, player.metrics.marketShare + 2);
  player.metrics.heat = Math.min(100, player.metrics.heat + 6);

  if (rival.blueprints?.length) {
    const bp = { ...rival.blueprints[0], id: uid("bp"), title: `[Merged] ${rival.blueprints[0].title}` };
    player.blueprints.push(bp);
  }

  rival.relation = "merged";
  rival.resources.capital = Math.max(0, (rival.resources.capital || 0) - absorbed);
  state.modifiers.allyIds = (state.modifiers.allyIds || []).filter((id) => id !== rival.id);

  const outcome = `Merged with ${rival.handle}. Absorbed ₡${absorbed} + a blueprint. Stress up.`;
  state.actions.push({ type: "merge", targetId: rival.id, outcome, tick: player.tick });
  pushLedger(state, outcome, player.tick);
  return { ok: true, outcome };
}

/** Compact seal for sharing empires between users/devices. */
export function encodeSeal(empire) {
  const payload = {
    v: 1,
    displayName: empire.displayName,
    handle: empire.handle,
    constraint: empire.constraint?.raw || empire.constraint,
    pitch: empire.pitch,
    seed: empire.seed,
    blueprints: (empire.blueprints || []).slice(0, 5).map((b) => ({
      kind: b.kind,
      title: b.title,
      summary: b.summary,
      steps: b.steps,
      materials: b.materials,
      riskNote: b.riskNote,
    })),
  };
  const json = JSON.stringify(payload);
  const b64 = btoa(unescape(encodeURIComponent(json)));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeSeal(seal) {
  try {
    let b64 = seal.trim().replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) b64 += "=";
    const json = decodeURIComponent(escape(atob(b64)));
    const data = JSON.parse(json);
    if (!data || !data.constraint) throw new Error("Invalid seal");
    const text = typeof data.constraint === "string" ? data.constraint : data.constraint.raw;
    const empire = generateEmpire(text, { seed: data.seed || 1, isRival: true });
    if (data.displayName) empire.displayName = data.displayName;
    if (data.handle) empire.handle = data.handle;
    if (data.pitch) empire.pitch = data.pitch;
    if (data.blueprints?.length) {
      empire.blueprints = data.blueprints.map((b) => ({
        id: uid("bp"),
        kind: b.kind || "process",
        title: b.title,
        summary: b.summary,
        steps: b.steps || [],
        materials: b.materials || [],
        riskNote: b.riskNote || "",
      }));
    }
    empire.relation = "neutral";
    return { ok: true, empire };
  } catch (e) {
    return { ok: false, error: "Could not read Empire Seal." };
  }
}

export function importRivalSeal(state, seal) {
  const res = decodeSeal(seal);
  if (!res.ok) return res;
  const exists = (state.rivals || []).some((r) => r.handle === res.empire.handle && r.seed === res.empire.seed);
  if (exists) return { ok: false, error: "That empire is already on your market floor." };
  state.rivals = [res.empire, ...(state.rivals || [])];
  pushLedger(state, `Imported rival seal: ${res.empire.handle}`, state.player?.tick || 0);
  return { ok: true, empire: res.empire };
}
